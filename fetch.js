const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FB_PAGE_NAME = 'ScienceAcademicServiceMJU';
const FB_PAGE_URL = `https://www.facebook.com/${FB_PAGE_NAME}`;
const IMG_DIR = 'images';
const MAX_POSTS = 6;

if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
}

// ฟังก์ชันดาวน์โหลดรูปภาพเก็บในโฟลเดอร์ images/
async function downloadImage(url, filepath) {
    if (!url) return false;
    const urlsToTry = [
        url,
        'https://wsrv.nl/?url=' + encodeURIComponent(url) + '&output=jpg'
    ];

    for (const tryUrl of urlsToTry) {
        try {
            const res = await fetch(tryUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
                }
            });
            if (!res.ok) continue;
            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer.length < 2000) continue; // ข้ามไอคอนขนาดเล็ก
            fs.writeFileSync(filepath, buffer);
            return true;
        } catch (e) {}
    }
    return false;
}

async function scrapeFacebookPage() {
    console.log(`Starting direct browser scraper for ${FB_PAGE_URL}...`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 2000 },
        locale: 'th-TH'
    });

    const page = await context.newPage();
    let scrapedPosts = [];

    try {
        // 1. เปิดหน้าเพจ Facebook
        await page.goto(FB_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // 2. ปิดป๊อปอัปให้ Login ของ Facebook (ถ้ามีขึ้นมาขวาง)
        try {
            const closeBtn = await page.$('div[aria-label="Close"], div[aria-label="ปิด"]');
            if (closeBtn) {
                await closeBtn.click();
                await page.waitForTimeout(1000);
            }
            await page.keyboard.press('Escape');
        } catch (e) {}

        // 3. เลื่อนหน้าจอลง 4 รอบเพื่อให้โหลดครบอย่างน้อย 6 โพสต์
        for (let step = 0; step < 5; step++) {
            await page.evaluate(() => window.scrollBy(0, 1400));
            await page.waitForTimeout(2000);

            // กดปุ่ม "ดูเพิ่มเติม / See more" ในโพสต์เพื่อเอาข้อความเต็ม
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
                buttons.forEach(btn => {
                    if (btn.innerText === 'ดูเพิ่มเติม' || btn.innerText === 'See more') {
                        btn.click();
                    }
                });
            });
        }

        // 4. สกัดข้อมูลโพสต์จาก DOM ของหน้าเพจ
        scrapedPosts = await page.evaluate((pageUrl) => {
            const results = [];
            const articles = Array.from(document.querySelectorAll('div[role="article"]'));

            for (const article of articles) {
                // ดึงข้อความในโพสต์
                const msgNode = article.querySelector('div[data-ad-preview="message"]') 
                             || article.querySelector('div[dir="auto"]');
                const text = msgNode ? msgNode.innerText.trim() : '';

                // ดึงรูปภาพขนาดใหญ่ในโพสต์ (ข้ามรูปโปรไฟล์เล็กๆ)
                const imgs = Array.from(article.querySelectorAll('img'));
                let bestImg = '';
                for (const img of imgs) {
                    const src = img.src || '';
                    const width = img.naturalWidth || img.width || 0;
                    if (src.includes('scontent') && width > 200 && !src.includes('emoji')) {
                        bestImg = src;
                        break;
                    }
                }

                // ดึงลิงก์ของโพสต์ (/posts/... หรือ /pcb.../ หรือ /photo/)
                const links = Array.from(article.querySelectorAll('a[href]'));
                let postLink = pageUrl;
                let postId = '';
                for (const a of links) {
                    const href = a.href || '';
                    if (href.includes('/posts/') || href.includes('/photos/') || href.includes('fbid=')) {
                        postLink = href.split('?')[0];
                        const m = href.match(/(?:posts\/|fbid=|pcb\.)(\d+)/);
                        if (m) postId = m[1];
                        break;
                    }
                }

                if ((text && text.length > 15) || bestImg) {
                    results.push({
                        id: postId || ('post_' + Math.random().toString(36).substring(2, 10)),
                        description: text || 'ข่าวประชาสัมพันธ์ ศูนย์บริการวิชาการด้านวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยแม่โจ้',
                        liveImgUrl: bestImg,
                        link: postLink
                    });
                }
            }
            return results;
        }, FB_PAGE_URL);

    } catch (err) {
        console.error('Scraping error:', err.message);
    } finally {
        await browser.close();
    }

    // กรองโพสต์ซ้ำออก
    const uniquePosts = [];
    const seenDesc = new Set();
    for (const p of scrapedPosts) {
        const key = p.description.substring(0, 60);
        if (!seenDesc.has(key)) {
            seenDesc.add(key);
            uniquePosts.push(p);
        }
    }

    console.log(`Found ${uniquePosts.length} unique posts from Facebook page.`);

    // อ่านโพสต์เดิมที่มีใน posts.json เพื่อสะสมให้ครบ 6 โพสต์เสมอ
    let existingPosts = [];
    if (fs.existsSync('posts.json')) {
        try {
            existingPosts = JSON.parse(fs.readFileSync('posts.json', 'utf8'));
        } catch (e) { existingPosts = []; }
    }

    const finalPosts = [];

    for (let i = 0; i < uniquePosts.length && finalPosts.length < MAX_POSTS; i++) {
        const item = uniquePosts[i];
        const postId = item.id.replace(/[^a-zA-Z0-9_]/g, '');
        const localImgPath = path.join(IMG_DIR, `post_${postId}.jpg`);
        let finalThumbnail = `images/post_${postId}.jpg`;

        if (fs.existsSync(localImgPath)) {
            console.log(`Post ${postId}: Using cached local image`);
        } else if (item.liveImgUrl && await downloadImage(item.liveImgUrl, localImgPath)) {
            console.log(`Post ${postId}: Downloaded image -> ${localImgPath}`);
        } else {
            finalThumbnail = item.liveImgUrl || '';
        }

        finalPosts.push({
            id: postId,
            title: item.description.substring(0, 70) + '...',
            description: item.description,
            pubDate: new Date().toISOString(),
            thumbnail: finalThumbnail,
            liveImgUrl: item.liveImgUrl,
            link: item.link
        });
    }

    // ถ้าดึงรอบนี้ได้ไม่ครบ 6 โพสต์ ให้เอาโพสต์เก่าใน posts.json มาเติมให้ครบ 6
    for (const oldPost of existingPosts) {
        if (finalPosts.length >= MAX_POSTS) break;
        const isDup = finalPosts.some(p => p.id === oldPost.id || p.description.substring(0, 50) === oldPost.description.substring(0, 50));
        if (!isDup) {
            finalPosts.push(oldPost);
        }
    }

    if (finalPosts.length > 0) {
        fs.writeFileSync('posts.json', JSON.stringify(finalPosts.slice(0, MAX_POSTS), null, 2), 'utf8');
        console.log(`Successfully saved ${finalPosts.length} posts to posts.json!`);
    } else {
        console.log('No new posts extracted in this run, keeping existing posts.json.');
    }
}

scrapeFacebookPage();
