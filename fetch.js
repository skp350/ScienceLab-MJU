const fs = require('fs');
const path = require('path');

// ลิงก์ RSS จริงของเพจ ScienceAcademicServiceMJU
const RSS_URL = 'https://fetchrss.com/feed/1x2Ksn3K62qo1xOV35C1wG7W.rss';
const FB_PAGE_URL = 'https://www.facebook.com/ScienceAcademicServiceMJU';
const IMG_DIR = 'images';
const MAX_ARCHIVE = 20; // เก็บสะสมประวัติข่าวไว้สูงสุด 20 ข่าว (หน้าเว็บจะโชว์ 6 ข่าวบนสุด)

if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
}

function cleanFacebookUrl(rawUrl, postId) {
    if (!rawUrl) return FB_PAGE_URL;
    let fixed = rawUrl.replace(/facebook\.com\/\d+\/posts\//, 'facebook.com/ScienceAcademicServiceMJU/posts/');
    if (postId && !fixed.includes('/posts/')) {
        fixed = `https://www.facebook.com/ScienceAcademicServiceMJU/posts/${postId}`;
    }
    return fixed;
}

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
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
            });
            if (!res.ok) continue;

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('image')) continue;

            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer.length < 1500) continue;

            fs.writeFileSync(filepath, buffer);
            return true;
        } catch (e) {}
    }
    return false;
}

async function run() {
    console.log('Fetching latest posts from FetchRSS...');
    const res = await fetch(RSS_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SciLabMJUFeedBot/1.0)' }
    });
    if (!res.ok) {
        console.log('RSS unreachable, keeping existing posts.json.');
        return;
    }
    const xml = await res.text();

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [...xml.matchAll(itemRegex)];

    if (items.length === 0) {
        console.log('No items found in RSS.');
        return;
    }

    const fetchedPosts = [];

    for (let i = 0; i < items.length; i++) {
        const itemXml = items[i][1];
        const title = (itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim();
        const rawLink = (itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || FB_PAGE_URL).trim();
        const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
        const guid = (itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || '').trim();

        const postIdMatch = rawLink.match(/posts\/(\d+)/) || guid.match(/_(\d+)/) || [null, `item_${i + 1}`];
        const postId = postIdMatch[1];
        const cleanLink = cleanFacebookUrl(rawLink, postId);

        let desc = itemXml.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/)?.[1]
            || itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';

        let imgUrl = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/)?.[1]
            || desc.match(/src=["']([^"']+)["']/)?.[1] || '';
        imgUrl = imgUrl.replace(/&amp;/g, '&').trim();

        let cleanText = desc
            .replace(/<span[\s\S]*?<\/span>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\(Feed generated with FetchRSS\)/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        const localImgPath = path.join(IMG_DIR, `post_${postId}.jpg`);
        let finalThumbnail = `images/post_${postId}.jpg`;

        if (fs.existsSync(localImgPath)) {
            console.log(`Post ${postId}: Image already saved`);
        } else if (imgUrl && await downloadImage(imgUrl, localImgPath)) {
            console.log(`Post ${postId}: Downloaded new image -> ${localImgPath}`);
        } else if (imgUrl) {
            finalThumbnail = imgUrl;
        }

        fetchedPosts.push({
            id: postId,
            title: title || 'ข่าวประชาสัมพันธ์ ศูนย์บริการวิชาการฯ',
            description: cleanText || title,
            pubDate: pubDate,
            thumbnail: finalThumbnail,
            liveImgUrl: imgUrl,
            link: cleanLink
        });
    }

    // 1. อ่านคลังข่าวเก่าใน posts.json (ตัดข่าวจำลอง scilab_ ทิ้ง)
    let archivePosts = [];
    if (fs.existsSync('posts.json')) {
        try {
            const parsed = JSON.parse(fs.readFileSync('posts.json', 'utf8'));
            archivePosts = parsed.filter(p => !String(p.id).startsWith('scilab_'));
        } catch (e) {}
    }

    // 2. เอาข่าวใหม่วางไว้หน้าสุด แล้วตามด้วยข่าวเก่าที่มีอยู่แล้ว (ไม่ซ้ำ ID)
    // เมื่อมีโพสต์ใหม่มา โพสต์เก่าจะถูกเลื่อนลำดับลงไปเรื่อยๆ อัตโนมัติ!
    const combinedMap = new Map();
    fetchedPosts.forEach(p => combinedMap.set(p.id, p));
    archivePosts.forEach(p => {
        if (!combinedMap.has(p.id)) {
            combinedMap.set(p.id, p);
        }
    });

    const updatedArchive = Array.from(combinedMap.values()).slice(0, MAX_ARCHIVE);

    fs.writeFileSync('posts.json', JSON.stringify(updatedArchive, null, 2), 'utf8');
    console.log(`Updated rolling archive! Total stored: ${updatedArchive.length} posts (Displaying top 6).`);
}

run();
