import math
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.basePen import BasePen
from fontTools.pens.recordingPen import RecordingPen

BASK = r"C:\Stayvoo\scripts\brand-logo\LibreBaskerville-Bold.ttf"
PLEX = r"C:\Stayvoo\scripts\brand-logo\IBMPlexSans-Medium.ttf"

NAVY = "#091A36"
PAPER = "#F8FAFD"
ACCENT = "#3D74B0"
BRAND_ORANGE = "#E8833A"


def shape(font_path, text):
    blob = hb.Blob.from_file_path(font_path)
    face = hb.Face(blob)
    hbfont = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf)
    ttf = TTFont(font_path)
    glyph_order = ttf.getGlyphOrder()
    out = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        gname = glyph_order[info.codepoint]
        out.append({
            "name": gname,
            "x_advance": pos.x_advance,
            "x_offset": pos.x_offset,
            "y_offset": pos.y_offset,
        })
    return ttf, out


def run_positions(font_path, text, track):
    ttf, glyphs = shape(font_path, text)
    x = 0
    positions = []
    for i, g in enumerate(glyphs):
        positions.append({"name": g["name"], "x": x})
        x += g["x_advance"]
        if i < len(glyphs) - 1:
            x += track
    return ttf, positions, x


class FlattenPen(BasePen):
    """Records flattened contours as lists of (x, y) points, one list per contour."""

    def __init__(self, glyphSet, samples=40):
        BasePen.__init__(self, glyphSet)
        self.contours = []
        self.samples = samples

    def _moveTo(self, pt):
        self.contours.append([pt])

    def _lineTo(self, pt):
        self.contours[-1].append(pt)

    def _curveToOne(self, pt1, pt2, pt3):
        p0 = self.contours[-1][-1]
        n = self.samples
        for i in range(1, n + 1):
            t = i / n
            mt = 1 - t
            x = (mt ** 3) * p0[0] + 3 * (mt ** 2) * t * pt1[0] + 3 * mt * (t ** 2) * pt2[0] + (t ** 3) * pt3[0]
            y = (mt ** 3) * p0[1] + 3 * (mt ** 2) * t * pt1[1] + 3 * mt * (t ** 2) * pt2[1] + (t ** 3) * pt3[1]
            self.contours[-1].append((x, y))

    def _qCurveToOne(self, pt1, pt2):
        p0 = self.contours[-1][-1]
        n = self.samples
        for i in range(1, n + 1):
            t = i / n
            mt = 1 - t
            x = (mt ** 2) * p0[0] + 2 * mt * t * pt1[0] + (t ** 2) * pt2[0]
            y = (mt ** 2) * p0[1] + 2 * mt * t * pt1[1] + (t ** 2) * pt2[1]
            self.contours[-1].append((x, y))

    def _closePath(self):
        pass


def get_flattened_contours(ttf, gname, samples=40):
    gs = ttf.getGlyphSet()
    pen = FlattenPen(gs, samples=samples)
    gs[gname].draw(pen)
    return pen.contours


class RawContourPen(BasePen):
    """Records per-contour ops, decomposing TrueType implied-on-curve qCurveTo
    sequences into simple (one off-curve control point + on-curve end) segments,
    same as BasePen does for _qCurveToOne. No flattening."""

    def __init__(self, glyphSet):
        BasePen.__init__(self, glyphSet)
        self.contours = []

    def _moveTo(self, pt):
        self.contours.append([("moveTo", pt)])

    def _lineTo(self, pt):
        self.contours[-1].append(("lineTo", pt))

    def _curveToOne(self, pt1, pt2, pt3):
        self.contours[-1].append(("curveTo", (pt1, pt2, pt3)))

    def _qCurveToOne(self, pt1, pt2):
        self.contours[-1].append(("qCurveTo", (pt1, pt2)))

    def _closePath(self):
        self.contours[-1].append(("closePath", ()))


def get_raw_contours(ttf, gname):
    """Returns list of contours; each contour is a list of (op, args) tuples, unflattened,
    with qCurveTo already decomposed to simple 1-control-point segments."""
    gs = ttf.getGlyphSet()
    pen = RawContourPen(gs)
    gs[gname].draw(pen)
    return pen.contours


def contour_to_svg_d(contour):
    pen_out = []
    for op, args in contour:
        if op == "moveTo":
            pt = args
            pen_out.append(f"M{pt[0]:.2f} {pt[1]:.2f}")
        elif op == "lineTo":
            pt = args
            pen_out.append(f"L{pt[0]:.2f} {pt[1]:.2f}")
        elif op == "qCurveTo":
            p1, p2 = args
            pen_out.append(f"Q{p1[0]:.2f} {p1[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}")
        elif op == "curveTo":
            p1, p2, p3 = args
            pen_out.append(f"C{p1[0]:.2f} {p1[1]:.2f} {p2[0]:.2f} {p2[1]:.2f} {p3[0]:.2f} {p3[1]:.2f}")
        elif op == "closePath":
            pen_out.append("Z")
    return " ".join(pen_out)


def signed_area(pts):
    a = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def bbox_of(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def pitched_roofline_path(
    left, right, top_of_o, o_height, stroke_weight,
    eave_ratio=0.08, gap_ratio=0.12, peak_rise_ratio=1.01, peak_offset_ratio=0.0,
    chimney_t=0.45, chimney_w_ratio=0.10, chimney_h_of_peak_ratio=0.35,
    include_chimney=True, taper_len_mult=2.4,
):
    """Single source of truth for the roofline.

    A steep, confident rise from the left eave to a centered peak (~34deg,
    matching the approved reference), descending symmetrically to the right
    eave with a small zigzag notch — up (vertical), across (diagonal,
    parallel to the roofline's own slope, not horizontal — this is what
    gives it the lightning-bolt look rather than a flat-topped chimney
    stack), down (vertical) — unless include_chimney=False (16px favicon
    cut, where the notch doesn't survive). The main line is a plain stroke
    (fill:none) — plain SVG strokes can't taper, so the two eave ends get
    small solid-filled triangular caps in the same color that extend the
    stroke's flat butt-cap into a fine point, faking a brush/pen taper
    without any gradient or opacity trick.

    Returns a dict: main_d, left_taper_d, right_taper_d, span_left, span_right,
    visual_left, visual_right (span extended by the taper tips), peak_y, base_y.
    """
    span = right - left
    eave = eave_ratio * span
    span_left = left - eave
    span_right = right + eave

    base_y = top_of_o + gap_ratio * o_height
    peak_y = top_of_o + peak_rise_ratio * o_height
    peak_rise = peak_y - base_y
    center_x = (span_left + span_right) / 2.0
    peak_x = center_x - peak_offset_ratio * (span_right - span_left)

    left_pt = (span_left, base_y)
    peak_pt = (peak_x, peak_y)
    right_pt = (span_right, base_y)

    if include_chimney:
        t = chimney_t
        ax = peak_pt[0] + (right_pt[0] - peak_pt[0]) * t
        ay = peak_pt[1] + (right_pt[1] - peak_pt[1]) * t
        slope_dydx = (right_pt[1] - peak_pt[1]) / (right_pt[0] - peak_pt[0])
        chimney_w = chimney_w_ratio * span
        chimney_h = chimney_h_of_peak_ratio * peak_rise
        bx, by = ax, ay + chimney_h
        cx2 = bx + chimney_w
        cy2 = by + chimney_w * slope_dydx
        t2 = (cx2 - peak_pt[0]) / (right_pt[0] - peak_pt[0])
        dy = peak_pt[1] + (right_pt[1] - peak_pt[1]) * t2
        d_pt = (cx2, dy)
        pts = [left_pt, peak_pt, (ax, ay), (bx, by), (cx2, cy2), d_pt, right_pt]
    else:
        pts = [left_pt, peak_pt, right_pt]

    main_d = f"M{pts[0][0]:.2f} {pts[0][1]:.2f} " + " ".join(f"L{p[0]:.2f} {p[1]:.2f}" for p in pts[1:])

    def taper_triangle(p_end, p_prev):
        dx, dy = p_end[0] - p_prev[0], p_end[1] - p_prev[1]
        length = math.hypot(dx, dy)
        ux, uy = dx / length, dy / length
        nx, ny = -uy, ux
        hw = stroke_weight / 2.0
        taper_len = taper_len_mult * stroke_weight
        tip = (p_end[0] + ux * taper_len, p_end[1] + uy * taper_len)
        b1 = (p_end[0] + nx * hw, p_end[1] + ny * hw)
        b2 = (p_end[0] - nx * hw, p_end[1] - ny * hw)
        d = f"M{b1[0]:.2f} {b1[1]:.2f} L{tip[0]:.2f} {tip[1]:.2f} L{b2[0]:.2f} {b2[1]:.2f} Z"
        return d, tip

    left_taper_d, left_tip = taper_triangle(pts[0], pts[1])
    right_taper_d, right_tip = taper_triangle(pts[-1], pts[-2])

    return {
        "main_d": main_d,
        "left_taper_d": left_taper_d,
        "right_taper_d": right_taper_d,
        "span_left": span_left,
        "span_right": span_right,
        "visual_left": min(span_left, left_tip[0]),
        "visual_right": max(span_right, right_tip[0]),
        "peak_y": peak_y,
        "base_y": base_y,
    }


def get_svg_path(ttf, gname):
    gs = ttf.getGlyphSet()
    pen = SVGPathPen(gs)
    gs[gname].draw(pen)
    return pen.getCommands()


def translate_d(d, x, y):
    return f'<path d="{d}" transform="translate({x:.2f},{y:.2f})"/>'


def glyph_ink_bbox(ttf, gname, samples=10):
    contours = get_flattened_contours(ttf, gname, samples=samples)
    pts = [p for c in contours for p in c]
    return bbox_of(pts)


def o_wall_thickness(ttf):
    """Proxy for letterform stem weight: the 'o' glyph's stroke wall (outer minus inner radius)."""
    contours = sorted(get_flattened_contours(ttf, "o", samples=16), key=lambda c: -abs(signed_area(c)))
    outer_bbox = bbox_of(contours[0])
    inner_bbox = bbox_of(contours[1])
    return inner_bbox[0] - outer_bbox[0]
