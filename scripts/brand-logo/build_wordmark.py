from build_logo import (
    BASK, PLEX, NAVY, PAPER, ACCENT, BRAND_ORANGE,
    shape, get_svg_path, glyph_ink_bbox, o_wall_thickness, pitched_roofline_path, TTFont
)

OUT_DIR = r"C:\Stayvoo\frontend\public\brand"

bask = TTFont(BASK)
plex = TTFont(PLEX)

WORD_TRACK = -10.0          # -1% of 1000upm optical tightening
TAG_FS = 0.235
TAG_TRACK_UNITS = 120
TAG_GAP_BELOW_DESCENDER = 130
PAD = 60

STROKE_WEIGHT = 0.475 * o_wall_thickness(bask)


def word_positions():
    ttf, glyphs = shape(BASK, "Stayvoo")
    x = 0.0
    positions = []
    for i, g in enumerate(glyphs):
        positions.append({"name": g["name"], "x": x})
        if i < len(glyphs) - 1:
            x += g["x_advance"] + WORD_TRACK
    return positions


def normal_glyph_paths(positions, skip_indices=()):
    xml = []
    for i, p in enumerate(positions):
        if i in skip_indices:
            continue
        d = get_svg_path(bask, p["name"])
        if d:
            xml.append(f'<path d="{d}" transform="translate({p["x"]:.2f},0)"/>')
    return xml


def roofline_for_oo(o1_origin, o2_origin):
    o_ink = glyph_ink_bbox(bask, "o")
    left = o1_origin + o_ink[0]
    right = o2_origin + o_ink[2]
    top_of_o = o_ink[3]
    o_height = o_ink[3] - o_ink[1]
    return pitched_roofline_path(left, right, top_of_o, o_height, STROKE_WEIGHT)


def tagline_paths_and_metrics():
    ttf, glyphs = shape(PLEX, "BOOKING AGENCY")
    x = 0.0
    positions = []
    for i, g in enumerate(glyphs):
        positions.append({"name": g["name"], "x": x})
        x += g["x_advance"]
        if i < len(glyphs) - 1:
            x += TAG_TRACK_UNITS

    xml = []
    for p in positions:
        if p["name"] == "space":
            continue
        d = get_svg_path(plex, p["name"])
        if not d:
            continue
        tx = p["x"] * TAG_FS
        xml.append(f'<g transform="translate({tx:.2f},0) scale({TAG_FS})"><path d="{d}"/></g>')

    first_name = positions[0]["name"]
    first_ink = glyph_ink_bbox(plex, first_name)
    tag_left_ink = positions[0]["x"] * TAG_FS + first_ink[0] * TAG_FS

    last_visible = [p for p in positions if p["name"] != "space"][-1]
    last_ink = glyph_ink_bbox(plex, last_visible["name"])
    tag_right_ink = last_visible["x"] * TAG_FS + last_ink[2] * TAG_FS

    cap_ink = glyph_ink_bbox(plex, "B")
    cap_top_local = cap_ink[3] * TAG_FS

    return xml, tag_left_ink, tag_right_ink, cap_top_local


def build(with_tagline, dark):
    """dark=False -> navy wordmark on light bg (logo-full/logo-wordmark)
       dark=True  -> paper wordmark on navy bg (logo-full-white/logo-wordmark-white)"""
    positions = word_positions()
    o1_origin = positions[5]["x"]
    o2_origin = positions[6]["x"]

    body_xml = normal_glyph_paths(positions, skip_indices=set())
    roof = roofline_for_oo(o1_origin, o2_origin)

    s_ink = glyph_ink_bbox(bask, "S")
    word_left_ink = positions[0]["x"] + s_ink[0]
    last_o_right = positions[6]["x"] + glyph_ink_bbox(bask, "o")[2]
    word_bottom_desc = -260.0
    word_top = max(780.0, roof["peak_y"] + STROKE_WEIGHT / 2.0)

    word_color = PAPER if dark else NAVY
    tag_color = PAPER if dark else ACCENT
    tag_opacity = "0.7" if dark else "1"

    content_left = min(word_left_ink, roof["visual_left"])
    content_right = max(last_o_right, roof["visual_right"])

    if with_tagline:
        tag_xml, tag_left_ink, tag_right_ink, cap_top_local = tagline_paths_and_metrics()
        shift_x = word_left_ink - tag_left_ink
        tag_baseline_y = word_bottom_desc - TAG_GAP_BELOW_DESCENDER - cap_top_local
        tag_group = f'<g transform="translate({shift_x:.2f},{tag_baseline_y:.2f})">\n' + "\n".join(tag_xml) + "\n</g>"
        tag_right_final = shift_x + tag_right_ink
        content_right = max(content_right, tag_right_final)
        content_top = word_top
        content_bottom = tag_baseline_y + glyph_ink_bbox(plex, "O")[1] * TAG_FS
        name = "logo-full"
    else:
        tag_group = ""
        content_top = word_top
        content_bottom = word_bottom_desc
        name = "logo-wordmark"

    width = (content_right - content_left) + 2 * PAD
    height = (content_top - content_bottom) + 2 * PAD
    tx = -content_left + PAD
    ty = content_top + PAD

    tag_block = f'<g fill="{tag_color}" fill-opacity="{tag_opacity}">\n{tag_group}\n</g>\n' if with_tagline else ""

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.2f} {height:.2f}">
<g transform="translate({tx:.2f},{ty:.2f}) scale(1,-1)">
<g fill="{word_color}">
{chr(10).join(body_xml)}
</g>
<g fill="{BRAND_ORANGE}">
<path d="{roof['main_d']}" fill="none" stroke="{BRAND_ORANGE}" stroke-width="{STROKE_WEIGHT:.2f}" stroke-linecap="butt" stroke-linejoin="miter"/>
<path d="{roof['left_taper_d']}"/>
<path d="{roof['right_taper_d']}"/>
</g>
{tag_block}</g>
</svg>
'''
    suffix = "-white" if dark else ""
    out_path = f"{OUT_DIR}\\{name}{suffix}.svg"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print("wrote", out_path, width, height)


build(with_tagline=True, dark=False)
build(with_tagline=True, dark=True)
build(with_tagline=False, dark=False)
build(with_tagline=False, dark=True)
