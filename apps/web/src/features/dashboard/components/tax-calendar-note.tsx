export default function TaxCalendarNote() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Quarterly IVA regime assumed. Filing and payment are tracked separately. Reference:{" "}
      <a
        className="underline underline-offset-2"
        href="https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/calendario_fiscal/Pages/Quadro_res_Pag_2026.aspx"
        target="_blank"
        rel="noreferrer"
      >
        AT 2026 payment calendar
      </a>
      .
    </p>
  );
}
