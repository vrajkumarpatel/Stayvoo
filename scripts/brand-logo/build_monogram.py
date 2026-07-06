from build_logo import (
    BASK, NAVY, PAPER, BRAND_ORANGE,
    shape, get_svg_path, glyph_ink_bbox, o_wall_thickness, pitched_roofline_path, TTFont
)

OUT_DIR = r"C:\Stayvoo\frontend\public\brand"

bask = TTFont(BASK)

WORD_TRACK = -10.0
SIDE = 512.0
CORNER_R = 0.15 * SIDE
FILL_WIDTH_RATIO = 0.65

STROKE_WEIGHT = 0.6 * o_wall_thickness(bask)
STROKE_WEIGHT_16 = STROKE_WEIGHT * 1.35  # small-size rule: thicken slightly when the chimney is dropped


def oo_positions():
    ttf, glyphs = shape(BASK, "oo")
    o1_origin = 0.0
    o2_origin = glyphs[0]["x_advance"] + WORD_TRACK
    return o1_origin, o2_origin


def build(include_chimney, stroke_weight, out_name):
    o1_origin, o2_origin = oo_positions()
    d_o = get_svg_path(bask, "o")
    o_ink = glyph_ink_bbox(bask, "o")

    left = o1_origin + o_ink[0]
    right = o2_origin + o_ink[2]
    top_of_o = o_ink[3]
    bottom_of_o = o_ink[1]
    o_height = o_ink[3] - o_ink[1]

    roof_d, span_left, span_right, peak_y, base_y = pitched_roofline_path(
        left, right, top_of_o, o_height, include_chimney=include_chimney
    )

    o1_xml = f'<path d="{d_o}" transform="translate({o1_origin:.2f},0)"/>'
    o2_xml = f'<path d="{d_o}" transform="translate({o2_origin:.2f},0)"/>'

    content_left = span_left
    content_right = span_right
    content_top = peak_y + stroke_weight / 2.0
    content_bottom = bottom_of_o
    content_w = content_right - content_left

    target_w = FILL_WIDTH_RATIO * SIDE
    scale = target_w / content_w

    cx_content = (content_left + content_right) / 2.0
    cy_content = (content_top + content_bottom) / 2.0

    tx = SIDE / 2.0 - cx_content * scale
    ty = SIDE / 2.0 + cy_content * scale

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIDE:.0f} {SIDE:.0f}">
<rect x="0" y="0" width="{SIDE:.0f}" height="{SIDE:.0f}" rx="{CORNER_R:.2f}" ry="{CORNER_R:.2f}" fill="{NAVY}"/>
<g transform="translate({tx:.2f},{ty:.2f}) scale({scale:.5f},{-scale:.5f})">
<g fill="{PAPER}">
{o1_xml}
{o2_xml}
</g>
<path d="{roof_d}" fill="none" stroke="{BRAND_ORANGE}" stroke-width="{stroke_weight:.2f}" stroke-linecap="butt" stroke-linejoin="miter"/>
</g>
</svg>
'''
    out_path = f"{OUT_DIR}\\{out_name}.svg"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print("wrote", out_path)


# master monogram: full chimney detail, master stroke weight
build(include_chimney=True, stroke_weight=STROKE_WEIGHT, out_name="monogram")

# 16px favicon cut only: no chimney, slightly thicker stroke
build(include_chimney=False, stroke_weight=STROKE_WEIGHT_16, out_name="monogram-16")
