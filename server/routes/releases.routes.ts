import express from 'express';
import { db } from '../../src/db';
import { platformReleases } from '../../src/db/schema';
import { desc } from 'drizzle-orm';

const router = express.Router();

router.get('/api/releases/latest', async (req, res) => {
  try {
    const releases = await db.select()
      .from(platformReleases)
      .orderBy(desc(platformReleases.publishedAt))
      .limit(1);

    if (releases.length === 0) {
      return res.json({
        success: true,
        release: {
          version: '10.2.0',
          windows: 'https://releases.varejopro.com/v10.2.0/VarejoPro-Setup-10.2.0.exe',
          android: 'https://releases.varejopro.com/v10.2.0/VarejoPro-10.2.0.apk',
          publishedAt: new Date().toISOString()
        }
      });
    }

    const current = releases[0];
    const versionString = current.version; // e.g. "10.2.0"
    
    return res.json({
      success: true,
      release: {
        version: versionString,
        windows: `https://releases.varejopro.com/v${versionString}/VarejoPro-Setup-${versionString}.exe`,
        android: `https://releases.varejopro.com/v${versionString}/VarejoPro-${versionString}.apk`,
        publishedAt: current.publishedAt
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
