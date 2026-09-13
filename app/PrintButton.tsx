"use client";

export function PrintButton({ label = "Print report" }: { label?: string }) {
  return <button className="print-button" type="button" onClick={() => window.print()}>{label}</button>;
}
