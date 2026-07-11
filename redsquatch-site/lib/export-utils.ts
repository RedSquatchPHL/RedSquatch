import type { DiscoveryForm, DemandForm } from '@/components/intake/types';

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

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
