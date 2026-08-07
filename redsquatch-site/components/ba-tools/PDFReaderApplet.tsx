'use client';

import { Download, ExternalLink } from 'lucide-react';

const PDF_PATH = '/books/BABOK_Guide_v3_Member.pdf';

// Plain <iframe> onto the static PDF — browsers render PDFs natively (page nav,
// search, zoom), so this needs no client-side PDF library.
export default function PDFReaderApplet() {
  return (
    <div className="flex flex-col gap-2 h-[75vh]">
      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          BABOK Guide v3 (Member Edition)
        </span>
        <div className="flex items-center gap-3">
          <a
            href={PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs hover:underline"
            style={{ color: '#d4a373' }}
          >
            <ExternalLink size={13} /> Open in new tab
          </a>
          <a
            href={PDF_PATH}
            download
            className="flex items-center gap-1 text-xs hover:underline"
            style={{ color: '#d4a373' }}
          >
            <Download size={13} /> Download
          </a>
        </div>
      </div>
      <iframe
        src={PDF_PATH}
        title="BABOK Guide v3"
        className="flex-1 w-full rounded-lg"
        style={{ border: '1px solid rgba(184,115,51,0.25)', background: '#fff' }}
      />
    </div>
  );
}
