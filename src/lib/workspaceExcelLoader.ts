import { validateAndIngestMultipleFiles } from './ingestService';
import { db } from './database';

/**
 * Automatically loads the 4 primary Excel files from the workspace (/excel/) on startup
 * if no user snapshot currently exists in memory or storage.
 */
export async function loadDefaultWorkspaceExcelFiles(snapshotDate: string = '2026-10-06'): Promise<void> {
  const existingOpps = db.getOpportunitiesForDate(snapshotDate);
  if (existingOpps.length > 0) {
    return;
  }

  try {
    const filePaths = [
      '/excel/Renewals Summary - Fiscal Q4.xlsx',
      '/excel/Renewals Summary - Fiscal 2026.xlsx',
      '/excel/Renewals Summary - Fiscal 2027.xlsx',
      '/excel/Renewal Comparison Tool.xlsx',
    ];

    const fileObjects: File[] = [];

    for (const path of filePaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const blob = await response.blob();
          const fileName = decodeURIComponent(path.split('/').pop() || 'dataset.xlsx');
          const file = new File([blob], fileName, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          fileObjects.push(file);
        }
      } catch (e) {
        console.warn(`Failed to fetch default workspace Excel file ${path}:`, e);
      }
    }

    if (fileObjects.length > 0) {
      await validateAndIngestMultipleFiles(fileObjects, snapshotDate);
      console.log(`Successfully loaded ${fileObjects.length} primary workspace Excel files for ${snapshotDate}`);
    }
  } catch (e) {
    console.error('Error loading default workspace Excel files:', e);
  }
}
