import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import type { DiscoveryForm, DemandForm, GroupsReport } from '@/components/intake/types';

type Section = { heading: string; body: string };

const discoverySections = (form: DiscoveryForm): Section[] => [
  { heading: 'Their Process', body: form.their_process || '' },
  { heading: 'Expected Outcome', body: form.expected_outcome || '' },
  { heading: 'Pain Points', body: form.pain_points || '' },
  { heading: 'Ideal Method', body: form.ideal_method || '' },
  { heading: 'Your Interpretation', body: form.your_interpretation || '' },
];

const demandSections = (form: DemandForm): Section[] => [
  { heading: 'Business Case', body: form.business_case || '' },
  { heading: 'Assumptions', body: form.assumptions || '' },
  { heading: 'Enablers', body: form.enablers || '' },
  { heading: 'In Scope', body: form.in_scope || '' },
  { heading: 'Out of Scope', body: form.out_of_scope || '' },
  { heading: 'Barriers', body: form.barriers || '' },
  { heading: 'Fixes', body: form.fixes || '' },
];

export const exportDiscoveryAsMarkdown = (form: DiscoveryForm): string => {
  return `# Discovery Form

**SNWR:** ${form.snwr_number || '—'}
**Requester:** ${form.requester_name || '—'}, ${form.requester_dept || '—'}
**Date:** ${new Date().toISOString().split('T')[0]}

## Their Process
${form.their_process || ''}

## Expected Outcome
${form.expected_outcome || ''}

## Pain Points
${form.pain_points || ''}

## Ideal Method
${form.ideal_method || ''}

## Your Interpretation
${form.your_interpretation || ''}

---
*Status: ${form.status}*
`;
};

export const exportDemandAsMarkdown = (form: DemandForm, discovery?: DiscoveryForm | null): string => {
  return `# Demand Form

**Status:** ${form.status}
${discovery ? `**From Discovery:** ${discovery.snwr_number || '—'}` : ''}

## Business Case
${form.business_case || ''}

## Assumptions
${form.assumptions || ''}

## Enablers
${form.enablers || ''}

## In Scope
${form.in_scope || ''}

## Out of Scope
${form.out_of_scope || ''}

## Barriers
${form.barriers || ''}

## Fixes
${form.fixes || ''}

---
*Generated: ${new Date().toISOString()}*
`;
};

export const generateReportMarkdown = (report: GroupsReport, selectedGroupIds: number[]): string => {
  const rows = report.active.filter(r => selectedGroupIds.includes(r.group.id));

  const section = rows.map(r => `## ${r.group.name}

**Status:** ${r.group.status}
**Work items:** ${r.item_count} | **Journal updates in period:** ${r.journal_count}

${r.recent_updates.map(u => `- ${u.session_date} (${u.session_status}): ${u.why || '—'}`).join('\n') || '_No recent updates._'}
`).join('\n');

  return `# Bi-Weekly Report

**Period:** ${report.period.start_date} to ${report.period.end_date}
**Groups included:** ${rows.length} of ${report.summary.total_groups}

${section}

---
*Generated: ${new Date().toISOString()}*
`;
};

export function downloadMarkdown(filename: string, content: string) {
  downloadBlob(filename, new Blob([content], { type: 'text/markdown;charset=utf-8' }));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildPdf(title: string, meta: string[], sections: Section[]): jsPDF {
  const doc = new jsPDF();
  const marginX = 15;
  const pageBottom = 280;
  let y = 20;

  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.text(title.toUpperCase(), marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const line of meta) {
    doc.text(line, marginX, y);
    y += 5;
  }
  y += 4;

  for (const { heading, body } of sections) {
    if (y > pageBottom - 10) { doc.addPage(); y = 20; }
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.text(heading.toUpperCase(), marginX, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines: string[] = doc.splitTextToSize(body || '—', 180);
    for (const line of lines) {
      if (y > pageBottom) { doc.addPage(); y = 20; }
      doc.text(line, marginX, y);
      y += 5;
    }
    y += 6;
  }

  return doc;
}

async function buildDocx(title: string, meta: string[], sections: Section[]): Promise<Blob> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: title.toUpperCase(), heading: HeadingLevel.TITLE }),
        ...meta.map(line => new Paragraph({ text: line })),
        ...sections.flatMap(({ heading, body }) => [
          new Paragraph({ text: heading.toUpperCase(), heading: HeadingLevel.HEADING_2 }),
          ...(body || '—').split('\n').map(line => new Paragraph({ text: line })),
        ]),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

export function exportDiscoveryAsPdf(form: DiscoveryForm) {
  const meta = [
    `SNWR: ${form.snwr_number || '—'}`,
    `Requester: ${form.requester_name || '—'}, ${form.requester_dept || '—'}`,
    `Status: ${form.status}`,
  ];
  buildPdf('Discovery Form', meta, discoverySections(form)).save(`discovery-${form.snwr_number || form.id}.pdf`);
}

export async function exportDiscoveryAsDocx(form: DiscoveryForm) {
  const meta = [
    `SNWR: ${form.snwr_number || '—'}`,
    `Requester: ${form.requester_name || '—'}, ${form.requester_dept || '—'}`,
    `Status: ${form.status}`,
  ];
  const blob = await buildDocx('Discovery Form', meta, discoverySections(form));
  downloadBlob(`discovery-${form.snwr_number || form.id}.docx`, blob);
}

export function exportDemandAsPdf(form: DemandForm, discovery?: DiscoveryForm | null) {
  const meta = [
    `Status: ${form.status}`,
    ...(discovery ? [`From Discovery: ${discovery.snwr_number || '—'}`] : []),
  ];
  buildPdf('Demand Form', meta, demandSections(form)).save(`demand-${form.id}.pdf`);
}

export async function exportDemandAsDocx(form: DemandForm, discovery?: DiscoveryForm | null) {
  const meta = [
    `Status: ${form.status}`,
    ...(discovery ? [`From Discovery: ${discovery.snwr_number || '—'}`] : []),
  ];
  const blob = await buildDocx('Demand Form', meta, demandSections(form));
  downloadBlob(`demand-${form.id}.docx`, blob);
}
