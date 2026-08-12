"""
Service de génération de factures et devis PDF avec ReportLab.
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    HRFlowable,
)

from core.firebase import get_bucket, get_db

TPS_RATE = 0.05
TVQ_RATE = 0.09975

# ── Infos du garage (repli si le garage n'a pas encore rempli ses infos) ───
GARAGE_NOM_DEFAUT     = "Mon Garage"
GARAGE_ADRESSE_DEFAUT = ""
GARAGE_TEL_DEFAUT     = ""


def _infos_garage(garage_id: str) -> tuple[str, str, str]:
    """Retourne (nom, adresse, telephone) du garage, avec repli si absent."""
    doc = get_db().collection("garages").document(garage_id).get()
    if not doc.exists:
        return GARAGE_NOM_DEFAUT, GARAGE_ADRESSE_DEFAUT, GARAGE_TEL_DEFAUT
    data = doc.to_dict()
    return (
        data.get("nom") or GARAGE_NOM_DEFAUT,
        data.get("adresse") or GARAGE_ADRESSE_DEFAUT,
        data.get("telephone") or GARAGE_TEL_DEFAUT,
    )

# ── Couleurs ───────────────────────────────────────────────────────────────
BLEU       = colors.HexColor("#1e3a5f")
BLEU_CLAIR = colors.HexColor("#e8eef5")
GRIS_TEXTE = colors.HexColor("#4b5563")
GRIS_LIGNE = colors.HexColor("#e5e7eb")
BLANC      = colors.white


def _s():
    return {
        "garage_nom": ParagraphStyle("garage_nom", fontName="Helvetica-Bold", fontSize=16, textColor=BLEU, leading=20),
        "garage_info": ParagraphStyle("garage_info", fontName="Helvetica", fontSize=9, textColor=GRIS_TEXTE, leading=13),
        "doc_titre": ParagraphStyle("doc_titre", fontName="Helvetica-Bold", fontSize=13, textColor=BLANC, leading=16, alignment=TA_CENTER),
        "box_label": ParagraphStyle("box_label", fontName="Helvetica-Bold", fontSize=8, textColor=GRIS_TEXTE, leading=11),
        "box_valeur": ParagraphStyle("box_valeur", fontName="Helvetica", fontSize=10, textColor=colors.HexColor("#111827"), leading=13),
        "box_total_label": ParagraphStyle("box_total_label", fontName="Helvetica-Bold", fontSize=9, textColor=BLEU, leading=12),
        "box_total_valeur": ParagraphStyle("box_total_valeur", fontName="Helvetica-Bold", fontSize=13, textColor=BLEU, leading=16),
        "section_label": ParagraphStyle("section_label", fontName="Helvetica-Bold", fontSize=8, textColor=GRIS_TEXTE, leading=11),
        "section_valeur": ParagraphStyle("section_valeur", fontName="Helvetica", fontSize=10, textColor=colors.HexColor("#111827"), leading=13),
        "th": ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=9, textColor=BLANC, leading=12),
        "td": ParagraphStyle("td", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#111827"), leading=12),
        "td_center": ParagraphStyle("td_center", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#111827"), leading=12, alignment=TA_CENTER),
        "td_right": ParagraphStyle("td_right", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#111827"), leading=12, alignment=TA_RIGHT),
        "sous_label": ParagraphStyle("sous_label", fontName="Helvetica", fontSize=9, textColor=GRIS_TEXTE, alignment=TA_RIGHT),
        "sous_valeur": ParagraphStyle("sous_valeur", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#111827"), alignment=TA_RIGHT),
        "total_label": ParagraphStyle("total_label", fontName="Helvetica-Bold", fontSize=11, textColor=BLANC, alignment=TA_RIGHT),
        "total_valeur": ParagraphStyle("total_valeur", fontName="Helvetica-Bold", fontSize=11, textColor=BLANC, alignment=TA_RIGHT),
        "merci": ParagraphStyle("merci", fontName="Helvetica", fontSize=8, textColor=GRIS_TEXTE, alignment=TA_CENTER),
    }


def _generer_pdf_document(
    doc_id: str,
    titre_doc: str,
    numero: str,
    client_nom: str,
    client_telephone: str,
    data: dict,
    total_pieces: float,
    total_services: float,
    main_oeuvre: list,
    total_main_oeuvre: float,
    total: float,
    storage_folder: str,
    garage_id: str,
) -> str:
    garage_nom, garage_adresse, garage_tel = _infos_garage(garage_id)
    buffer = io.BytesIO()
    page_w, page_h = letter
    margin = 0.6 * inch
    usable_w = page_w - 2 * margin

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=margin,
        leftMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
    )

    s = _s()
    elements = []

    # Date/heure formatée
    try:
        dt = datetime.fromisoformat(data["date_creation"])
        date_str = dt.strftime("%d/%m/%Y")
        heure_str = dt.strftime("%H:%M")
    except Exception:
        date_str = data["date_creation"][:10]
        heure_str = ""

    # ── BLOC EN-TÊTE ──────────────────────────────────────────────────────
    garage_col = [
        Paragraph(garage_nom, s["garage_nom"]),
        Spacer(1, 4),
        Paragraph(garage_adresse, s["garage_info"]),
        Paragraph(garage_tel, s["garage_info"]),
    ]

    box_inner = Table(
        [
            [Paragraph(titre_doc, s["doc_titre"])],
            [Table(
                [
                    [Paragraph(f"N° {titre_doc}", s["box_label"]), Paragraph(numero, s["box_valeur"])],
                    [Paragraph("DATE",        s["box_label"]),  Paragraph(date_str, s["box_valeur"])],
                    [Paragraph("HEURE",       s["box_label"]),  Paragraph(heure_str, s["box_valeur"])],
                    [Paragraph("TOTAL",       s["box_total_label"]), Paragraph(f"{total:.2f} $", s["box_total_valeur"])],
                ],
                colWidths=[1.0 * inch, 1.3 * inch],
                style=TableStyle([
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("LINEABOVE", (0, 3), (-1, 3), 0.5, GRIS_LIGNE),
                ]),
            )],
        ],
        colWidths=[2.4 * inch],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BLEU),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 1), (-1, 1), 0),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("BOX", (0, 0), (-1, -1), 1, BLEU),
        ]),
    )

    header_table = Table(
        [[garage_col, box_inner]],
        colWidths=[usable_w - 2.5 * inch, 2.5 * inch],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ]),
    )
    elements.append(header_table)
    elements.append(Spacer(1, 0.2 * inch))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=BLEU, spaceAfter=0.15 * inch))

    # ── CLIENT + VÉHICULE ─────────────────────────────────────────────────
    vehicule_parts = []
    if data.get("vehicule"):
        vehicule_parts.append(data["vehicule"])
    if data.get("annee"):
        vehicule_parts.append(data["annee"])
    if data.get("taille_moteur"):
        vehicule_parts.append(data["taille_moteur"])
    vehicule_str = "  •  ".join(vehicule_parts) if vehicule_parts else "—"
    if data.get("plaque"):
        vehicule_str += f"<br/>Plaque : {data['plaque']}"
    if data.get("vin"):
        vehicule_str += f"<br/>VIN : {data['vin']}"
    if not data.get("plaque") and not data.get("vin") and data.get("autre"):
        vehicule_str += f"<br/>{data['autre']}"

    client_vehicule = Table(
        [
            [Paragraph("FACTURER À" if titre_doc == "FACTURE" else "CLIENT", s["section_label"]), Paragraph("VÉHICULE", s["section_label"])],
            [
                Paragraph(f"<b>{client_nom}</b><br/>{client_telephone}", s["section_valeur"]),
                Paragraph(vehicule_str, s["section_valeur"]),
            ],
        ],
        colWidths=[usable_w / 2, usable_w / 2],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BLEU_CLAIR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("LINEAFTER", (0, 0), (0, -1), 0.5, GRIS_LIGNE),
            ("BOX", (0, 0), (-1, -1), 0.5, GRIS_LIGNE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]),
    )
    elements.append(client_vehicule)
    elements.append(Spacer(1, 0.2 * inch))

    # ── TABLEAU UNIFIÉ PIÈCES + SERVICES + MAIN D'ŒUVRE ───────────────────
    col_w = [
        0.35 * inch,        # #
        usable_w * 0.45,    # Description
        0.95 * inch,        # Fourni client
        1.0 * inch,         # Prix unit.
        1.0 * inch,         # Total
    ]

    lignes = [[
        Paragraph("#", s["th"]),
        Paragraph("Description", s["th"]),
        Paragraph("Fourni client", s["th"]),
        Paragraph("Prix unit.", s["th"]),
        Paragraph("Total", s["th"]),
    ]]

    numero_ligne = 1
    pieces = data.get("pieces", [])
    services = data.get("services", [])

    sep_style = ParagraphStyle("sep", fontName="Helvetica-Bold", fontSize=8, textColor=BLEU)
    sep_indices = []

    # ── Section PIÈCES
    if pieces:
        sep_indices.append(len(lignes))
        lignes.append([
            Paragraph("", sep_style),
            Paragraph("PIÈCES", sep_style),
            Paragraph("", sep_style),
            Paragraph("", sep_style),
            Paragraph("", sep_style),
        ])
        for p in pieces:
            fournie = p.get("fournie_par_client", False)
            prix_unit = 0.0 if fournie else p.get("prix", 0)
            total_ligne = 0.0 if fournie else prix_unit * p.get("quantite", 1)
            desc = f"{p.get('nom', '')}  ×{p.get('quantite', 1)}"
            lignes.append([
                Paragraph(str(numero_ligne), s["td_center"]),
                Paragraph(desc, s["td"]),
                Paragraph("✓" if fournie else "—", s["td_center"]),
                Paragraph(f"{prix_unit:.2f} $" if not fournie else "—", s["td_right"]),
                Paragraph(f"{total_ligne:.2f} $" if not fournie else "—", s["td_right"]),
            ])
            numero_ligne += 1

    # ── Section SERVICES
    if services:
        sep_indices.append(len(lignes))
        lignes.append([
            Paragraph("", sep_style),
            Paragraph("SERVICES", sep_style),
            Paragraph("", sep_style),
            Paragraph("", sep_style),
            Paragraph("", sep_style),
        ])
        for sv in services:
            lignes.append([
                Paragraph(str(numero_ligne), s["td_center"]),
                Paragraph(sv.get("nom", ""), s["td"]),
                Paragraph("—", s["td_center"]),
                Paragraph(f"{sv.get('prix', 0):.2f} $", s["td_right"]),
                Paragraph(f"{sv.get('prix', 0):.2f} $", s["td_right"]),
            ])
            numero_ligne += 1

    # ── Section MAIN D'ŒUVRE (devis uniquement)
    if main_oeuvre:
        sep_indices.append(len(lignes))
        lignes.append([
            Paragraph("", sep_style),
            Paragraph("MAIN D'ŒUVRE", sep_style),
            Paragraph("", sep_style),
            Paragraph("", sep_style),
            Paragraph("", sep_style),
        ])
        for m in main_oeuvre:
            heures = m.get("heures", 0)
            taux = m.get("taux_horaire", 0)
            prix = heures * taux
            desc = f"{m.get('description', '')}  ({heures}h)"
            lignes.append([
                Paragraph(str(numero_ligne), s["td_center"]),
                Paragraph(desc, s["td"]),
                Paragraph("—", s["td_center"]),
                Paragraph(f"{taux:.2f} $/h", s["td_right"]),
                Paragraph(f"{prix:.2f} $", s["td_right"]),
            ])
            numero_ligne += 1

    table_style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BLEU),
        ("TEXTCOLOR", (0, 0), (-1, 0), BLANC),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLANC, colors.HexColor("#f8fafc")]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, GRIS_LIGNE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ("ALIGN", (3, 0), (4, -1), "RIGHT"),
    ]

    for idx in sep_indices:
        table_style_cmds += [
            ("BACKGROUND", (0, idx), (-1, idx), BLEU_CLAIR),
            ("TEXTCOLOR", (0, idx), (-1, idx), BLEU),
            ("FONTNAME", (0, idx), (-1, idx), "Helvetica-Bold"),
            ("LINEABOVE", (0, idx), (-1, idx), 1, BLEU),
        ]

    main_table = Table(lignes, colWidths=col_w)
    main_table.setStyle(TableStyle(table_style_cmds))
    elements.append(main_table)
    elements.append(Spacer(1, 0.2 * inch))

    # ── TOTAUX (bas droite) ───────────────────────────────────────────────
    sous_total = total_pieces + total_services + total_main_oeuvre
    tps = sous_total * TPS_RATE
    tvq = sous_total * TVQ_RATE

    totaux_rows = [
        [Paragraph("Sous-total pièces :", s["sous_label"]),   Paragraph(f"{total_pieces:.2f} $", s["sous_valeur"])],
        [Paragraph("Sous-total services :", s["sous_label"]), Paragraph(f"{total_services:.2f} $", s["sous_valeur"])],
    ]
    if main_oeuvre:
        totaux_rows.append(
            [Paragraph("Sous-total main d'œuvre :", s["sous_label"]), Paragraph(f"{total_main_oeuvre:.2f} $", s["sous_valeur"])]
        )
    idx_sous_total = len(totaux_rows)
    totaux_rows.append(
        [Paragraph("Sous-total :", s["sous_label"]), Paragraph(f"{sous_total:.2f} $", s["sous_valeur"])]
    )
    totaux_rows.append(
        [Paragraph(f"TPS ({TPS_RATE*100:.0f}%) :", s["sous_label"]), Paragraph(f"{tps:.2f} $", s["sous_valeur"])]
    )
    totaux_rows.append(
        [Paragraph(f"TVQ ({TVQ_RATE*100:.3f}%) :", s["sous_label"]), Paragraph(f"{tvq:.2f} $", s["sous_valeur"])]
    )

    totaux_inner = Table(
        totaux_rows,
        colWidths=[1.6 * inch, 1.1 * inch],
        style=TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LINEABOVE", (0, idx_sous_total), (-1, idx_sous_total), 0.5, GRIS_LIGNE),
        ]),
    )

    total_box = Table(
        [[Paragraph("TOTAL", s["total_label"]), Paragraph(f"{total:.2f} $", s["total_valeur"])]],
        colWidths=[1.6 * inch, 1.1 * inch],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BLEU),
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]),
    )

    totaux_wrapper = Table(
        [
            [Spacer(1, 1), totaux_inner],
            [Spacer(1, 1), total_box],
        ],
        colWidths=[usable_w - 2.75 * inch, 2.75 * inch],
        style=TableStyle([
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]),
    )
    elements.append(totaux_wrapper)
    elements.append(Spacer(1, 0.35 * inch))

    # ── PIED DE PAGE ──────────────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=0.5, color=GRIS_LIGNE, spaceAfter=0.08 * inch))
    elements.append(Paragraph(f"Merci de votre confiance. — {garage_nom}", s["merci"]))

    doc.build(elements)
    buffer.seek(0)

    bucket = get_bucket()
    blob = bucket.blob(f"{storage_folder}/{doc_id}.pdf")
    blob.upload_from_file(buffer, content_type="application/pdf")
    blob.make_public()

    return blob.public_url


def generer_pdf_facture(
    facture_id: str,
    client_nom: str,
    client_telephone: str,
    data: dict,
) -> str:
    return _generer_pdf_document(
        doc_id=facture_id,
        titre_doc="FACTURE",
        numero=data.get("numero_facture") or facture_id[:8].upper(),
        client_nom=client_nom,
        client_telephone=client_telephone,
        data=data,
        total_pieces=data.get("total_pieces", 0),
        total_services=data.get("total_services", 0),
        main_oeuvre=[],
        total_main_oeuvre=0,
        total=data.get("total_facture", 0),
        storage_folder="factures",
        garage_id=data["garage_id"],
    )


def generer_pdf_devis(
    devis_id: str,
    client_nom: str,
    client_telephone: str,
    data: dict,
) -> str:
    return _generer_pdf_document(
        doc_id=devis_id,
        titre_doc="DEVIS",
        numero=data.get("numero_devis") or devis_id[:8].upper(),
        client_nom=client_nom,
        client_telephone=client_telephone,
        data=data,
        total_pieces=data.get("total_pieces", 0),
        total_services=data.get("total_services", 0),
        main_oeuvre=data.get("main_oeuvre", []),
        total_main_oeuvre=data.get("total_main_oeuvre", 0),
        total=data.get("total_devis", 0),
        storage_folder="devis",
        garage_id=data["garage_id"],
    )
