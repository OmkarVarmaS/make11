/**
 * Service to sync real-time fantasy points from a Google Sheet.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet with 2 columns: [name, points]
 * 2. File > Share > Publish to web
 * 3. Select 'Comma-separated values (.csv)'
 * 4. Paste that URL below
 */

const POINTS_CSV_URL = "PASTE_YOUR_GOOGLE_SHEETS_CSV_URL_HERE";

export const fetchRealPoints = async (): Promise<Record<string, number>> => {
  if (POINTS_CSV_URL.includes("PASTE_YOUR")) {
    console.warn("Points Sync: No Google Sheets URL provided. Using mock points.");
    return {};
  }

  try {
    const response = await fetch(POINTS_CSV_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/);
    const pointsMap: Record<string, number> = {};
    
    // Process rows (skipping header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV split (handles basic names, avoid names with commas)
      const parts = line.split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const points = parseInt(parts[1].trim()) || 0;
        pointsMap[name] = points;
      }
    }
    
    console.log(`Points Sync: Successfully loaded ${Object.keys(pointsMap).length} player scores.`);
    return pointsMap;
  } catch (error) {
    console.error("Points Sync Error:", error);
    return {};
  }
};
