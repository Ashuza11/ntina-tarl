#!/usr/bin/env python3
"""Generate printable 50-item language-variation elicitation packets."""

from __future__ import annotations

import csv
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "adaption" / "reviewer-packets"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Balanced coverage across all tutor functions. Quotas total 50.
QUOTAS = {
    "instruction": 8,
    "praise": 8,
    "hint": 7,
    "correction": 6,
    "level_transition": 6,
    "encouragement": 5,
    "closing": 3,
    "repair": 3,
    "escalation": 2,
    "facilitator": 2,
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def select_acts() -> list[dict[str, str]]:
    rows = read_csv(ROOT / "data" / "spec" / "dialogue-acts.csv")
    selected: list[dict[str, str]] = []
    used = {category: 0 for category in QUOTAS}
    for row in rows:
        category = row["category"]
        if category in QUOTAS and used[category] < QUOTAS[category]:
            selected.append(row)
            used[category] += 1
    assert len(selected) == 50, (len(selected), used)
    assert used == QUOTAS, used
    return selected


def resolved_sw_source() -> dict[str, str]:
    rows = read_csv(ROOT / "data" / "scaffolding" / "sw-en.csv")
    resolved = {}
    for row in rows:
        verdict = row["verdict"].strip()
        text = row["corrected_text"].strip() if verdict == "fix" else row["text_draft"].strip()
        if not text:
            raise ValueError(f"No resolved Swahili text for {row['act_id']}")
        resolved[row["act_id"]] = text
    return resolved


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("DejaVu", FONT))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", FONT_BOLD))


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitleUnicode",
            parent=base["Title"],
            fontName="DejaVu-Bold",
            fontSize=18,
            leading=23,
            alignment=TA_CENTER,
            spaceAfter=8 * mm,
        ),
        "h1": ParagraphStyle(
            "H1Unicode",
            parent=base["Heading1"],
            fontName="DejaVu-Bold",
            fontSize=13,
            leading=17,
            spaceBefore=3 * mm,
            spaceAfter=2 * mm,
        ),
        "body": ParagraphStyle(
            "BodyUnicode",
            parent=base["BodyText"],
            fontName="DejaVu",
            fontSize=9.2,
            leading=12.5,
            spaceAfter=1.5 * mm,
        ),
        "small": ParagraphStyle(
            "SmallUnicode",
            parent=base["BodyText"],
            fontName="DejaVu",
            fontSize=7.8,
            leading=10.2,
        ),
        "label": ParagraphStyle(
            "LabelUnicode",
            parent=base["BodyText"],
            fontName="DejaVu-Bold",
            fontSize=8.2,
            leading=10.5,
        ),
    }


def footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("DejaVu", 7)
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.drawString(18 * mm, 10 * mm, "Ntina language-variation elicitation pilot")
    canvas.drawRightString(192 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def line_box(label: str, style, height: float = 14 * mm) -> Table:
    table = Table(
        [[Paragraph(label, style), ""]],
        colWidths=[42 * mm, 132 * mm],
        rowHeights=[height],
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#777777")),
                ("LINEBEFORE", (1, 0), (1, 0), 0.5, colors.HexColor("#AAAAAA")),
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F2F2F2")),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def metadata_cover(story, st, language: str, target: str, instructions: list[str]) -> None:
    story.append(Paragraph(f"{language}: 50-item variation pilot", st["title"]))
    story.append(Paragraph(f"Target: {target}", st["h1"]))
    story.append(Paragraph(
        "This is an elicitation and validation packet, not a test of the speaker. "
        "Write what a real teacher, parent, or tutor from your community would naturally say to one child.",
        st["body"],
    ))
    story.append(Paragraph("Speaker and reviewer information", st["h1"]))
    for label in [
        "Name or participant code",
        "Home town / community",
        "Named language variety",
        "Other languages regularly used",
        "Role (teacher / parent / other)",
        "Age group taught or cared for",
        "Reviewer name or code",
        "Date",
    ]:
        story.append(line_box(label, st["label"], 9 * mm))
        story.append(Spacer(1, 1.2 * mm))
    story.append(Paragraph("Instructions", st["h1"]))
    for idx, item in enumerate(instructions, 1):
        story.append(Paragraph(f"{idx}. {item}", st["body"]))
    story.append(Paragraph(
        "Consent note: do not include a child's real name, phone number, address, school, or other identifying information. "
        "Participation should be voluntary, and project consent procedures must be followed before collecting recordings.",
        st["body"],
    ))
    story.append(PageBreak())


def item_header(index: int, row: dict[str, str], st) -> list:
    meta = (
        f"<b>{index:02d}. {row['act_id']}</b> &nbsp; | &nbsp; "
        f"Category: {row['category']} &nbsp; | &nbsp; Level: {row['tarl_level']} &nbsp; | &nbsp; "
        f"Audience: {row['audience']} &nbsp; | &nbsp; Maximum: {row['max_words']} words"
    )
    return [
        Paragraph(meta, st["small"]),
        Spacer(1, 1 * mm),
        Paragraph(f"<b>Situation:</b> {row['function']}", st["body"]),
    ]


def bukavu_item(index: int, row: dict[str, str], source: str, st) -> KeepTogether:
    blocks = item_header(index, row, st)
    blocks.extend(
        [
            Paragraph(f"<b>Standard Kiswahili reference:</b> {source}", st["body"]),
            line_box("Natural Bukavu Kivu Swahili", st["label"], 18 * mm),
            Spacer(1, 1.2 * mm),
            line_box("French/English switch, if natural", st["label"], 10 * mm),
            Spacer(1, 1.2 * mm),
            line_box("Notes / alternative wording", st["label"], 12 * mm),
            Spacer(1, 2.5 * mm),
        ]
    )
    return KeepTogether(blocks)


def yoruba_item(index: int, row: dict[str, str], st) -> KeepTogether:
    blocks = item_header(index, row, st)
    blocks.extend(
        [
            line_box("Standard Yorùbá version", st["label"], 17 * mm),
            Spacer(1, 1.2 * mm),
            line_box("Named regional variety", st["label"], 17 * mm),
            Spacer(1, 1.2 * mm),
            line_box("English switch, if natural", st["label"], 9 * mm),
            Spacer(1, 1.2 * mm),
            line_box("Tone / spelling / usage notes", st["label"], 11 * mm),
            Spacer(1, 2.5 * mm),
        ]
    )
    return KeepTogether(blocks)


def build_bukavu(acts: list[dict[str, str]], sw: dict[str, str], st) -> Path:
    path = OUT / "bukavu-kivu-swahili-50-pilot.pdf"
    doc = SimpleDocTemplate(
        str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title="Bukavu Kivu Swahili 50-item variation pilot",
        author="Ntina project",
    )
    story = []
    metadata_cover(
        story,
        st,
        "Bukavu Kivu Swahili",
        "Natural child-directed tutor scaffolding used in Bukavu",
        [
            "Read the situation and Standard Kiswahili reference; preserve the same teaching purpose.",
            "Write the exact wording you would naturally use with one child in Bukavu. Do not imitate Tanzanian or Kenyan speech unless that is genuinely how you speak.",
            "Keep every example word, name, letter, sound, and number unchanged.",
            "Use ordinary normalized Swahili spelling. Note a spoken pronunciation separately instead of inventing a spelling.",
            "Add French or English only where it is natural in this context; do not force a switch.",
            "Stay within the stated maximum words where possible. Add alternatives or uncertainty in Notes.",
        ],
    )
    for index, row in enumerate(acts, 1):
        story.append(bukavu_item(index, row, sw[row["act_id"]], st))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return path


def build_yoruba(acts: list[dict[str, str]], st) -> Path:
    path = OUT / "yoruba-variety-50-pilot.pdf"
    doc = SimpleDocTemplate(
        str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title="Yorùbá 50-item regional variation pilot",
        author="Ntina project",
    )
    story = []
    metadata_cover(
        story,
        st,
        "Yorùbá",
        "Standard Yorùbá plus one explicitly named regional variety",
        [
            "State your town/community and the name you use for your Yorùbá variety. Do not write only “Yorùbá dialect.”",
            "For each situation, first write a correct Standard Yorùbá teacher utterance, then how you would naturally say it in your regional variety.",
            "Use correct ṣ, ẹ, ọ and tone marks. High tone uses an acute accent, low tone a grave accent, and mid tone is normally unmarked.",
            "Preserve the teaching purpose, singular/plural audience, and any literal example word, name, letter, sound, or number.",
            "Add English only where it is natural in your classroom community; do not force code-switching.",
            "If the Standard and regional versions are identical, write “same” in the regional field. Explain uncertain tone, spelling, or usage in Notes.",
        ],
    )
    for index, row in enumerate(acts, 1):
        story.append(yoruba_item(index, row, st))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return path


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    register_fonts()
    st = styles()
    acts = select_acts()
    sw = resolved_sw_source()
    outputs = [build_bukavu(acts, sw, st), build_yoruba(acts, st)]
    for path in outputs:
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
