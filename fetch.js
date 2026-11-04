const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FB_PAGE_NAME = 'ScienceAcademicServiceMJU';
const FB_PAGE_URL = `https://www.facebook.com/${FB_PAGE_NAME}`;
// ใช้ URL ของ Facebook Page Plugin ซึ่งเปิดสาธารณะและไม่ติดหน้า Login Wall บน GitHub Actions!
const FB_PLUGIN_URL = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FB_PAGE_URL)}&tabs=timeline&width=500&height=1800&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`;

const IMG_DIR = 'images';
const MAX_POSTS = 6;

if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
}

// โพสต์มาตรฐานของศูนย์บริการวิชาการฯ สำหรับเติมให้ครบ 6 โพสต์เสมอหากดึงสดได้น้อยกว่า 6
const defaultCenterPosts = [
    {
        id: 'scilab_sem_service',
        title: 'บริการวิเคราะห์ตัวอย่างด้วยกล้องจุลทรรศน์อิเล็กตรอน (SEM / EDS)',
        description: '🔬 ศูนย์บริการวิชาการด้านวิทยาศาสตร์และเทคโนโลยี คณะวิทยาศาสตร์ มหาวิทยาลัยแม่โจ้ เปิดให้บริการวิเคราะห์โครงสร้างพื้นผิวและองค์ประกอบธาตุด้วยกล้องจุลทรรศน์อิเล็กตรอนแบบส่องกราด (SEM/EDS) ประสิทธิภาพสูง สำหรับนักศึกษา อาจารย์ นักวิจัย และหน่วยงานภายนอก',
        pubDate: new Date().toISOString(),
        thumbnail: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
        liveImgUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
        link: FB_PAGE_URL
    },
    {
        id: 'scilab_online_portal',
        title: 'ระบบยื่นคำขอรับบริการเครื่องมือวิทยาศาสตร์ออนไลน์ (SciLab Portal)',
        description: '💻 ยกระดับการให้บริการสู่ระบบดิจิทัล Paperless 100% ผู้รับบริการสามารถค้นหาเครื่องมือวิทยาศาสตร์ ตรวจสอบอัตราค่าธรรมเนียม ยื่นคำร้องขอใช้บริการ และติดตามสถานะผลวิเคราะห์ออนไลน์ได้ตลอด 24 ชั่วโมง ผ่านเว็บไซต์ sciencelab.mju.ac.th',
        pubDate: new Date().toISOString(),
        thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
        liveImgUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
        link: FB_PAGE_URL
    },
    {
        id: 'scilab_chem_analysis',
        title: 'บริการเครื่องมือวิเคราะห์ขั้นสูงทางเคมี ชีวภาพ และวัสดุศาสตร์',
        description: '🧪 ให้บริการเครื่องมือวิทยาศาสตร์ขั้นสูง อาทิ HPLC, GC-MS, AAS, UV-Vis Spectrophotometer, FTIR และเครื่องมือทดสอบทางกายภาพ พร้อมบุคลากรผู้เชี่ยวชาญให้คำปรึกษาและดูแลการวิเคราะห์อย่างใกล้ชิด ณ อาคารจุฬาภรณ์ คณะวิทยาศาสตร์',
        pubDate: new Date().toISOString(),
        thumbnail: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        liveImgUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        link: FB_PAGE_URL
    },
    {
        id: 'scilab_workshop_training',
        title: 'โครงการอบรมเชิงปฏิบัติการเทคนิคการใช้เครื่องมือวิทยาศาสตร์ขั้นสูง',
        description: '🎓 ศูนย์บริการวิชาการฯ จัดกิจกรรมถ่ายทอดความรู้และฝึกอบรมทักษะการเตรียมตัวอย่างและการใช้เครื่องมือวิทยาศาสตร์ให้แก่นักศึกษา บุคลากร และผู้สนใจ เพื่อพัฒนาศักยภาพงานวิจัยและนวัตกรรมทางวิทยาศาสตร์และเทคโนโลยี',
        pubDate: new Date().toISOString(),
        thumbnail: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800&auto=format&fit=crop&q=80',
        liveImgUrl: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800&auto=format&fit=crop&q=80',
        link: FB_PAGE_URL
    },
    {
        id: 'scilab_academic_collab',
        title: 'ความร่วมมือทางวิชาการและการให้บริการวิเคราะห์ทดสอบมาตรฐานสากล',
        description: '🤝 ศูนย์บริการวิชาการด้านวิทยาศาสตร์และเทคโนโลยี มุ่งมั่นสนับสนุนงานวิจัย การเรียนการสอน และการบริการวิชาการแก่ชุมชนและภาคอุตสาหกรรม ด้วยเครื่องมือที่ทันสมัยและผลการวิเคราะห์ที่แม่นยำ เชื่อถือได้',
        pubDate: new Date().toISOString(),
        thumbnail: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&auto=format&fit=crop&q=80',
        liveImgUrl: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&auto=format&fit=crop&q=80',
        link: FB_PAGE_URL
    },
    {
        id: 'scilab_contact_info',
        title: 'ติดต่อสอบถามและขอรับคำปรึกษาการวิเคราะห์ตัวอย่าง',
        description: '📍 สถานที่ตั้ง: อาคารจุฬาภรณ์ คณะวิทยาศาสตร์ มหาวิทยาลัยแม่โจ้ เปิดให้บริการวันจันทร์ - ศุกร์ เวลา 08:30 - 16:30 น. ติดต่อสอบถามข้อมูลเครื่องมือและอัตราค่าบริการได้ทางเพจ Facebook หรือเว็บไซต์ศูนย์บริการวิชาการฯ',
        pubDate: new Date().toISOString(),
        thumbnail: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80',
        liveImgUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80',
        link: FB_PAGE_URL
    }
];

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
            if (buffer.length < 2000) continue;
            fs.writeFileSync(filepath, buffer);
            return true;
        } catch (e) {}
    }
    return false;
}

async function scrapeFacebookPlugin() {
    console.log('Opening Facebook Public Page Plugin to bypass login wall...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        viewport: { width: 600, height: 2000 },
        locale: 'th-TH'
    });

    const page = await context.newPage();
    let scrapedPosts = [];

    try {
        await page.goto(FB_PLUGIN_URL, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(3000);

        // เลื่อนภายในกล่อง Timeline ของ Plugin เพื่อโหลดโพสต์เพิ่ม
        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => {
                window.scrollBy(0, 1000);
                const scrollable = document.querySelector('.uiScrollableAreaWrap');
                if (scrollable) scrollable.scrollTop += 1000;
            });
            await page.waitForTimeout(1500);
        }

        // ดึงโพสต์จากโครงสร้างของ Facebook Page Plugin
        scrapedPosts = await page.evaluate((pageUrl) => {
            const results = [];
            // ใน Plugin โพสต์จะอยู่ในคลาส _5pcr หรือ userContentWrapper หรือ div ที่มีข้อความและรูป
            const postElements = Array.from(document.querySelectorAll('._5pcr, .userContentWrapper, div[role="article"], ._4-u2'));

            for (const el of postElements) {
                const textEl = el.querySelector('.userContent, ._5pbx, [data-ad-preview="message"]') || el;
                let text = textEl ? textEl.innerText.trim() : '';

                // ลบข้อความหัวเพจซ้ำๆ ออก
                text = text.replace(/ศูนย์บริการวิชาการด้านวิทยาศาสตร์และเทคโนโลยี[^\n]*\n?/g, '').trim();

                const imgs = Array.from(el.querySelectorAll('img'));
                let bestImg = '';
                for (const img of imgs) {
                    const src = img.src || '';
                    const w = img.naturalWidth || img.width || 0;
                    if (src.includes('scontent') && w > 120 && !src.includes('cp0')) {
                        bestImg = src;
                        break;
                    }
                }

                const links = Array.from(el.querySelectorAll('a[href]'));
                let postLink = pageUrl;
                let postId = '';
                for (const a of links) {
                    const href = a.href || '';
                    if (href.includes('/posts/') || href.includes('/photos/') || href.includes('story_fbid=') || href.includes('fbid=')) {
                        postLink = href.split('&')[0];
                        const m = href.match(/(?:posts\/|fbid=|story_fbid=|pcb\.)(\d+)/);
                        if (m) postId = m[1];
                        break;
                    }
                }

                if ((text && text.length > 20) && bestImg) {
                    results.push({
                        id: postId || ('fb_' + Math.random().toString(36).substring(2, 9)),
                        description: text,
                        liveImgUrl: bestImg,
                        link: postLink
                    });
                }
            }
            return results;
        }, FB_PAGE_URL);

    } catch (err) {
        console.error('Plugin scrape warning:', err.message);
    } finally {
        await browser.close();
    }

    // กรองโพสต์ซ้ำ
    const uniquePosts = [];
    const seen = new Set();
    for (const p of scrapedPosts) {
        const key = p.description.substring(0, 50);
        if (!seen.has(key)) {
            seen.add(key);
            uniquePosts.push(p);
        }
    }

    console.log(`Extracted ${uniquePosts.length} posts from Facebook Plugin.`);

    // อ่านโพสต์เดิมที่มีใน posts.json (ถ้ามี)
    let existingPosts = [];
    if (fs.existsSync('posts.json')) {
        try {
            existingPosts = JSON.parse(fs.readFileSync('posts.json', 'utf8'));
        } catch (e) { existingPosts = []; }
    }

    const finalPosts = [];

    // 1. ใส่โพสต์ที่ดึงมาได้สดๆ ก่อน
    for (const item of uniquePosts) {
        if (finalPosts.length >= MAX_POSTS) break;
        const postId = item.id.replace(/[^a-zA-Z0-9_]/g, '');
        const localImgPath = path.join(IMG_DIR, `post_${postId}.jpg`);
        let finalThumbnail = `images/post_${postId}.jpg`;

        if (fs.existsSync(localImgPath)) {
            console.log(`Post ${postId}: Cached image exists`);
        } else if (item.liveImgUrl && await downloadImage(item.liveImgUrl, localImgPath)) {
            console.log(`Post ${postId}: Saved image -> ${localImgPath}`);
        } else {
            finalThumbnail = item.liveImgUrl;
        }

        finalPosts.push({
            id: postId,
            title: item.description.substring(0, 65) + '...',
            description: item.description,
            pubDate: new Date().toISOString(),
            thumbnail: finalThumbnail,
            liveImgUrl: item.liveImgUrl,
            link: item.link
        });
    }

    // 2. เติมโพสต์จาก existingPosts (ถ้ายังไม่ครบ 6)
    for (const old of existingPosts) {
        if (finalPosts.length >= MAX_POSTS) break;
        if (!finalPosts.some(p => p.id === old.id)) {
            finalPosts.push(old);
        }
    }

    // 3. เติมด้วยโพสต์มาตรฐานของศูนย์ฯ เพื่อให้มีครบ 6 โพสต์เสมอ
    for (const def of defaultCenterPosts) {
        if (finalPosts.length >= MAX_POSTS) break;
        if (!finalPosts.some(p => p.id === def.id)) {
            const localImgPath = path.join(IMG_DIR, `post_${def.id}.jpg`);
            let thumb = def.thumbnail;
            if (await downloadImage(def.liveImgUrl, localImgPath)) {
                thumb = `images/post_${def.id}.jpg`;
            }
            finalPosts.push({
                ...def,
                thumbnail: thumb
            });
        }
    }

    // บันทึกไฟล์ posts.json เสมอ!
    fs.writeFileSync('posts.json', JSON.stringify(finalPosts.slice(0, MAX_POSTS), null, 2), 'utf8');
    console.log(`Saved ${finalPosts.length} posts to posts.json successfully!`);
}

scrapeFacebookPlugin();
