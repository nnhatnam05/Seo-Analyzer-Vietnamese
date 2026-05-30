/**
 * SeoAnalyzer.tsx
 * ================
 * Công cụ phân tích SEO real-time, tự viết hoàn toàn — không phụ thuộc YoastSEO.
 * Tối ưu 100% cho tiếng Việt & thị trường Việt Nam.
 *
 * Tích hợp:
 *   <SeoAnalyzer
 *     title={title}
 *     slug={slug}
 *     summary={summary}
 *     content={content}
 *     seoTitle={seoTitle}
 *     seoDescription={seoDescription}
 *     seoKeywords={seoKeywords}
 *   />
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Rating = 'good' | 'ok' | 'bad' | 'info';

interface CheckResult {
  id: string;
  category: 'seo' | 'readability' | 'technical';
  rating: Rating;
  label: string;
  detail: string;
  score: number; // 0–10
  priority: number; // hiển thị ưu tiên — số nhỏ lên đầu
}

interface SeoAnalyzerProps {
  title: string;
  slug: string;
  summary: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN = 'https://nguyenhoanggroup.vn';

const RATING_CFG: Record<Rating, { dot: string; bg: string; text: string; border: string; badge: string; label: string }> = {
  good: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Đạt',
  },
  ok: {
    dot: 'bg-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Cần cải thiện',
  },
  bad: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
    label: 'Chưa đạt',
  },
  info: {
    dot: 'bg-sky-400',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
    label: 'Gợi ý',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loại bỏ toàn bộ HTML tag và decode MỌI HTML entity thành ký tự Unicode thật.
 *
 * Tại sao dùng DOMParser thay vì regex?
 * CKEditor sinh ra entity như: &aacute; &agrave; &ecirc; &ocirc; &#x1B83; &#273; …
 * — tổng cộng hàng trăm named entity + numeric entity cho tiếng Việt có dấu.
 * Regex chỉ cover được một tập nhỏ cố định; DOMParser decode toàn bộ trong một lần,
 * đảm bảo mọi ký tự tiếng Việt được phục hồi đúng trước khi so sánh từ khoá.
 *
 * Fallback regex giữ lại cho môi trường SSR / non-browser (Next.js server component).
 */
function stripHtml(html: string): string {
  if (!html) return '';

  // Bước 1: Xoá <style> và <script> block (tránh text rác lẫn vào nội dung)
  const sanitized = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Bước 2: DOMParser — decode entity + strip tag trong một lần, chính xác tuyệt đối
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(sanitized, 'text/html');

      // Thêm khoảng trắng quanh block-level tags để tránh dính từ ("từnày""từkia")
      const BLOCK_TAGS = new Set([
        'P','DIV','LI','TD','TH','BLOCKQUOTE','H1','H2','H3','H4','H5','H6',
        'TR','DT','DD','FIGCAPTION','ARTICLE','SECTION','HEADER','FOOTER',
      ]);
      doc.querySelectorAll(Array.from(BLOCK_TAGS).join(',')).forEach((el) => {
        el.prepend(doc.createTextNode(' '));
        el.append(doc.createTextNode(' '));
      });

      return (doc.body.textContent ?? '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    } catch {
      // DOMParser thất bại → dùng fallback bên dưới
    }
  }

  // Bước 3: Fallback cho SSR — regex decode các entity phổ biến nhất của tiếng Việt
  return sanitized
    .replace(/<[^>]+>/g, ' ')
    // Numeric entities (decimal & hex) — bao phủ toàn bộ Unicode
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    )
    // Named entities thường gặp trong tiếng Việt (CKEditor output)
    .replace(/&aacute;/g,'á').replace(/&Aacute;/g,'Á')
    .replace(/&agrave;/g,'à').replace(/&Agrave;/g,'À')
    .replace(/&acirc;/g,'â').replace(/&Acirc;/g,'Â')
    .replace(/&atilde;/g,'ã').replace(/&Atilde;/g,'Ã')
    .replace(/&eacute;/g,'é').replace(/&Eacute;/g,'É')
    .replace(/&egrave;/g,'è').replace(/&Egrave;/g,'È')
    .replace(/&ecirc;/g,'ê').replace(/&Ecirc;/g,'Ê')
    .replace(/&iacute;/g,'í').replace(/&Iacute;/g,'Í')
    .replace(/&igrave;/g,'ì').replace(/&Igrave;/g,'Ì')
    .replace(/&oacute;/g,'ó').replace(/&Oacute;/g,'Ó')
    .replace(/&ograve;/g,'ò').replace(/&Ograve;/g,'Ò')
    .replace(/&ocirc;/g,'ô').replace(/&Ocirc;/g,'Ô')
    .replace(/&otilde;/g,'õ').replace(/&Otilde;/g,'Õ')
    .replace(/&uacute;/g,'ú').replace(/&Uacute;/g,'Ú')
    .replace(/&ugrave;/g,'ù').replace(/&Ugrave;/g,'Ù')
    .replace(/&yacute;/g,'ý').replace(/&Yacute;/g,'Ý')
    .replace(/&ntilde;/g,'ñ').replace(/&Ntilde;/g,'Ñ')
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&nbsp;/g,' ')
    .replace(/&hellip;/g,'…')
    .replace(/&ldquo;|&rdquo;/g,'"')
    .replace(/&lsquo;|&rsquo;/g,"'")
    .replace(/&ndash;/g,'–')
    .replace(/&mdash;/g,'—')
    // Xoá entity còn sót lại chưa decode được (tránh rác "&xxx;" lẫn vào text)
    .replace(/&[a-zA-Z]{2,8};/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Đếm số từ tiếng Việt chính xác:
 * - Tiếng Việt là ngôn ngữ cô lập, mỗi âm tiết = 1 từ (syllable-based)
 * - Tách theo khoảng trắng và dấu câu
 */
function countVietnameseWords(text: string): number {
  if (!text) return 0;
  const clean = text
    .replace(/[.,!?;:()\[\]{}"'«»—–…\n\r\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!clean) return 0;
  return clean.split(' ').filter((w) => w.length > 0).length;
}

/**
 * Đếm số câu tiếng Việt.
 * Câu kết thúc bằng: . ! ? hoặc xuống dòng sau văn bản dài.
 */
function countSentences(text: string): number {
  if (!text) return 0;
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  return Math.max(1, sentences.length);
}

/**
 * Tính mật độ từ khóa theo đơn vị cụm từ (phrase-level) trong văn bản thuần.
 * Xử lý chuẩn tiếng Việt: chuẩn hóa dấu, lowercase, và tìm cụm từ liên tiếp.
 */
function calcKeywordDensity(plainText: string, keyword: string): number {
  if (!plainText || !keyword) return 0;
  const normalizedText = plainText.toLowerCase().replace(/\s+/g, ' ');
  const normalizedKw = keyword.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalizedKw) return 0;

  let count = 0;
  let startIndex = 0;
  while (true) {
    const idx = normalizedText.indexOf(normalizedKw, startIndex);
    if (idx === -1) break;
    count++;
    startIndex = idx + normalizedKw.length;
  }

  const totalWords = countVietnameseWords(plainText);
  const kwWords = countVietnameseWords(keyword);
  if (totalWords === 0 || kwWords === 0) return 0;

  return (count * kwWords) / totalWords;
}

/** Trích xuất tất cả thẻ H (h1-h6) từ HTML */
function extractHeadings(html: string): { level: number; text: string }[] {
  if (!html) return [];
  const results: { level: number; text: string }[] = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    results.push({ level: parseInt(match[1], 10), text: stripHtml(match[2]) });
  }
  return results;
}

/** Trích xuất tất cả thẻ IMG và thuộc tính alt */
function extractImages(html: string): { src: string; alt: string }[] {
  if (!html) return [];
  const results: { src: string; alt: string }[] = [];
  const re = /<img([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const attrs = match[1];
    const srcM = attrs.match(/src=["']([^"']+)["']/i);
    const altM = attrs.match(/alt=["']([^"']*)["']/i);
    results.push({ src: srcM ? srcM[1] : '', alt: altM ? altM[1] : '' });
  }
  return results;
}

/** Trích xuất tất cả link trong HTML */
function extractLinks(html: string, domain: string): { href: string; text: string; isExternal: boolean }[] {
  if (!html) return [];
  const results: { href: string; text: string; isExternal: boolean }[] = [];
  const re = /<a([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const attrs = match[1];
    const hrefM = attrs.match(/href=["']([^"']+)["']/i);
    if (!hrefM) continue;
    const href = hrefM[1];
    const text = stripHtml(match[2]);
    const isExternal = href.startsWith('http') && !href.includes(domain.replace(/^https?:\/\//, ''));
    results.push({ href, text, isExternal });
  }
  return results;
}

/** Đếm số đoạn văn (<p> tag) */
function countParagraphs(html: string): { count: number; avgWords: number; longParagraphs: number } {
  if (!html) return { count: 0, avgWords: 0, longParagraphs: 0 };
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  const wordCounts: number[] = [];
  while ((match = re.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    if (text.length < 5) continue;
    wordCounts.push(countVietnameseWords(text));
  }
  if (wordCounts.length === 0) return { count: 0, avgWords: 0, longParagraphs: 0 };
  const total = wordCounts.reduce((a, b) => a + b, 0);
  return {
    count: wordCounts.length,
    avgWords: Math.round(total / wordCounts.length),
    longParagraphs: wordCounts.filter((w) => w > 150).length,
  };
}

/**
 * Kiểm tra từ khoá xuất hiện trong đoạn đầu tiên (200 từ đầu)
 */
function keywordInIntro(plainText: string, keyword: string): boolean {
  if (!plainText || !keyword) return false;
  const intro = plainText.split(' ').slice(0, 200).join(' ').toLowerCase();
  return intro.includes(keyword.toLowerCase());
}

/** Tính overall score từ danh sách kết quả */
function calcOverallScore(results: CheckResult[]): number {
  if (!results.length) return 0;
  const weighted = results.reduce((acc, r) => acc + r.score, 0);
  return Math.min(100, Math.round((weighted / (results.length * 10)) * 100));
}

/** Normalize từ khoá SEO để so sánh chính xác */
function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().replace(/[?!.,;:]/g, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO ENGINE — bộ quy tắc phân tích
// ─────────────────────────────────────────────────────────────────────────────

function runSeoChecks(params: {
  title: string;
  slug: string;
  plainSummary: string;
  plainContent: string;
  rawContent: string;
  seoTitle: string;
  seoDescription: string;
  keyword: string;
}): CheckResult[] {
  const {
    title,
    slug,
    plainSummary,
    plainContent,
    rawContent,
    seoTitle,
    seoDescription,
    keyword,
  } = params;

  const results: CheckResult[] = [];
  const kw = normalizeKeyword(keyword);
  const fullPlain = [plainContent, plainSummary].filter(Boolean).join(' ');
  const totalWords = countVietnameseWords(fullPlain);
  const density = calcKeywordDensity(fullPlain, kw);
  const headings = extractHeadings(rawContent);
  const images = extractImages(rawContent);
  const links = extractLinks(rawContent, DOMAIN);
  const internalLinks = links.filter((l) => !l.isExternal);
  const externalLinks = links.filter((l) => l.isExternal);
  const paragraphInfo = countParagraphs(rawContent);

  // ── 1. Focus Keyword (từ khoá chính) ───────────────────────────────────────
  if (!kw) {
    results.push({
      id: 'keyword_missing',
      category: 'seo',
      rating: 'bad',
      label: 'Thiếu từ khoá trọng tâm',
      detail: 'Bạn chưa nhập từ khoá SEO chính. Hãy điền vào trường "SEO Keywords" để bắt đầu phân tích.',
      score: 0,
      priority: 1,
    });
  }

  // ── 2. SEO Title ────────────────────────────────────────────────────────────
  if (!seoTitle) {
    results.push({
      id: 'seo_title_missing',
      category: 'seo',
      rating: 'bad',
      label: 'Thiếu tiêu đề SEO',
      detail: 'Tiêu đề SEO (SEO Title) chưa được nhập. Đây là yếu tố quan trọng nhất hiển thị trên kết quả tìm kiếm Google.',
      score: 0,
      priority: 1,
    });
  } else {
    const titleLen = seoTitle.length;
    let titleRating: Rating;
    let titleDetail: string;
    let titleScore: number;

    if (titleLen < 30) {
      titleRating = 'bad';
      titleScore = 3;
      titleDetail = `Tiêu đề SEO quá ngắn (${titleLen} ký tự). Hãy mở rộng đến 50–60 ký tự để Google hiển thị đầy đủ và tăng tỷ lệ nhấp chuột.`;
    } else if (titleLen <= 60) {
      titleRating = 'good';
      titleScore = 10;
      titleDetail = `Tiêu đề SEO đạt độ dài lý tưởng (${titleLen}/60 ký tự) — hiển thị tối ưu trên trang kết quả Google.`;
    } else if (titleLen <= 70) {
      titleRating = 'ok';
      titleScore = 7;
      titleDetail = `Tiêu đề SEO hơi dài (${titleLen}/60 ký tự). Google có thể cắt bớt phần cuối khi hiển thị. Nên rút ngắn về dưới 60 ký tự.`;
    } else {
      titleRating = 'bad';
      titleScore = 3;
      titleDetail = `Tiêu đề SEO quá dài (${titleLen} ký tự, chuẩn tối đa 60). Phần dư sẽ bị Google cắt bớt và dấu "…" làm giảm ấn tượng.`;
    }
    results.push({
      id: 'seo_title_length',
      category: 'seo',
      rating: titleRating,
      label: 'Độ dài tiêu đề SEO',
      detail: titleDetail,
      score: titleScore,
      priority: 2,
    });

    // Từ khoá trong SEO Title
    if (kw) {
      const titleHasKw = seoTitle.toLowerCase().includes(kw);
      const titleStartsKw = seoTitle.toLowerCase().startsWith(kw);
      results.push({
        id: 'keyword_in_seo_title',
        category: 'seo',
        rating: titleHasKw ? 'good' : 'bad',
        label: 'Từ khoá trong tiêu đề SEO',
        detail: titleHasKw
          ? titleStartsKw
            ? `Tuyệt vời! Từ khoá "${keyword}" xuất hiện ngay đầu tiêu đề SEO — Google ưu tiên cao nhất cho vị trí này.`
            : `Từ khoá "${keyword}" có trong tiêu đề SEO. Nếu có thể, hãy đặt từ khoá lên đầu tiêu đề để tăng thêm sức mạnh SEO.`
          : `Từ khoá "${keyword}" chưa xuất hiện trong tiêu đề SEO. Hãy thêm vào để tăng mức độ phù hợp với tìm kiếm.`,
        score: titleHasKw ? (titleStartsKw ? 10 : 8) : 2,
        priority: 1,
      });
    }
  }

  // ── 3. Meta Description ─────────────────────────────────────────────────────
  if (!seoDescription) {
    results.push({
      id: 'meta_desc_missing',
      category: 'seo',
      rating: 'bad',
      label: 'Thiếu Meta Description',
      detail: 'Meta Description chưa được nhập. Đây là đoạn mô tả hiển thị dưới tiêu đề trên Google — ảnh hưởng trực tiếp đến tỷ lệ nhấp chuột (CTR).',
      score: 0,
      priority: 1,
    });
  } else {
    const descLen = seoDescription.length;
    let descRating: Rating;
    let descScore: number;
    let descDetail: string;

    if (descLen < 70) {
      descRating = 'bad';
      descScore = 3;
      descDetail = `Meta Description quá ngắn (${descLen} ký tự). Hãy mở rộng đến 120–156 ký tự, bao gồm từ khoá và lời kêu gọi hành động (CTA).`;
    } else if (descLen <= 156) {
      descRating = 'good';
      descScore = 10;
      descDetail = `Meta Description đạt độ dài lý tưởng (${descLen}/156 ký tự) — hiển thị đầy đủ và thu hút người dùng.`;
    } else if (descLen <= 170) {
      descRating = 'ok';
      descScore = 6;
      descDetail = `Meta Description hơi dài (${descLen}/156 ký tự). Google có thể rút gọn phần cuối. Nên duy trì dưới 156 ký tự.`;
    } else {
      descRating = 'bad';
      descScore = 3;
      descDetail = `Meta Description quá dài (${descLen} ký tự). Phần vượt quá 156 ký tự sẽ bị Google cắt với dấu "…".`;
    }
    results.push({
      id: 'meta_desc_length',
      category: 'seo',
      rating: descRating,
      label: 'Độ dài Meta Description',
      detail: descDetail,
      score: descScore,
      priority: 2,
    });

    // Từ khoá trong Meta Description
    if (kw) {
      const descHasKw = seoDescription.toLowerCase().includes(kw);
      results.push({
        id: 'keyword_in_meta',
        category: 'seo',
        rating: descHasKw ? 'good' : 'ok',
        label: 'Từ khoá trong Meta Description',
        detail: descHasKw
          ? `Từ khoá "${keyword}" xuất hiện trong Meta Description — Google có thể in đậm từ khoá này khi hiển thị.`
          : `Từ khoá "${keyword}" chưa có trong Meta Description. Hãy thêm từ khoá vào một cách tự nhiên để tăng CTR.`,
        score: descHasKw ? 9 : 5,
        priority: 2,
      });
    }
  }

  // ── 4. URL Slug ─────────────────────────────────────────────────────────────
  if (!slug) {
    results.push({
      id: 'slug_missing',
      category: 'seo',
      rating: 'bad',
      label: 'Thiếu đường dẫn URL (Slug)',
      detail: 'Slug chưa được nhập. URL thân thiện SEO giúp Google hiểu chủ đề trang và cải thiện xếp hạng.',
      score: 0,
      priority: 2,
    });
  } else {
    const slugLen = slug.length;
    const isSlugClean = /^[a-z0-9-]+$/.test(slug);
    const hasDoubleHyphen = /--/.test(slug);
    const slugWords = slug.split('-').filter((w) => w.length > 0).length;

    if (!isSlugClean) {
      results.push({
        id: 'slug_format',
        category: 'seo',
        rating: 'bad',
        label: 'Định dạng URL Slug',
        detail: 'Slug URL chứa ký tự đặc biệt hoặc chữ hoa. Slug chuẩn SEO chỉ nên có chữ thường a-z, số 0-9 và dấu gạch ngang.',
        score: 2,
        priority: 2,
      });
    } else if (slugLen > 75) {
      results.push({
        id: 'slug_length',
        category: 'seo',
        rating: 'ok',
        label: 'Độ dài URL Slug',
        detail: `Slug URL khá dài (${slugLen} ký tự). Google khuyến nghị slug ngắn gọn, rõ nghĩa (dưới 75 ký tự).`,
        score: 6,
        priority: 3,
      });
    } else {
      results.push({
        id: 'slug_format',
        category: 'seo',
        rating: 'good',
        label: 'Định dạng URL Slug',
        detail: `Slug URL chuẩn SEO: "${slug}" — không dấu, chữ thường, ngắn gọn, dễ nhớ.`,
        score: 9,
        priority: 3,
      });
    }

    // Từ khoá trong slug
    if (kw) {
      const kwSlug = kw.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slugHasKw = kwSlug.split('-').some((part) => slug.includes(part) && part.length > 2);
      results.push({
        id: 'keyword_in_slug',
        category: 'seo',
        rating: slugHasKw ? 'good' : 'ok',
        label: 'Từ khoá trong URL Slug',
        detail: slugHasKw
          ? `Slug URL phản ánh từ khoá chính — giúp Google nhận diện chủ đề trang ngay từ đường dẫn.`
          : `Slug URL chưa thể hiện rõ từ khoá "${keyword}". Hãy cân nhắc đặt slug chứa từ khoá không dấu để tăng sức mạnh SEO URL.`,
        score: slugHasKw ? 9 : 5,
        priority: 3,
      });
    }
  }

  // ── 5. Độ dài bài viết ──────────────────────────────────────────────────────
  if (totalWords === 0) {
    results.push({
      id: 'content_length',
      category: 'seo',
      rating: 'bad',
      label: 'Nội dung bài viết',
      detail: 'Bài viết chưa có nội dung. Hãy nhập nội dung đầy đủ để công cụ phân tích SEO.',
      score: 0,
      priority: 1,
    });
  } else if (totalWords < 300) {
    results.push({
      id: 'content_length',
      category: 'seo',
      rating: 'bad',
      label: 'Độ dài nội dung',
      detail: `Bài viết quá ngắn (${totalWords} từ). Google ưu tiên nội dung dài, chuyên sâu. Tối thiểu 600 từ cho bài thông thường, 1.000+ từ cho bài định vị từ khoá cạnh tranh.`,
      score: 2,
      priority: 1,
    });
  } else if (totalWords < 600) {
    results.push({
      id: 'content_length',
      category: 'seo',
      rating: 'ok',
      label: 'Độ dài nội dung',
      detail: `Bài viết đạt ${totalWords} từ — ở mức tối thiểu chấp nhận được. Nên mở rộng lên 800–1.200 từ để tăng tính chuyên sâu và xếp hạng.`,
      score: 5,
      priority: 2,
    });
  } else if (totalWords < 1000) {
    results.push({
      id: 'content_length',
      category: 'seo',
      rating: 'good',
      label: 'Độ dài nội dung',
      detail: `Bài viết đạt ${totalWords} từ — độ dài tốt cho bài SEO cơ bản. Thêm nội dung hỗ trợ để tăng cạnh tranh từ khoá.`,
      score: 8,
      priority: 3,
    });
  } else {
    results.push({
      id: 'content_length',
      category: 'seo',
      rating: 'good',
      label: 'Độ dài nội dung',
      detail: `Bài viết xuất sắc với ${totalWords} từ — nội dung dài, chuyên sâu, tăng mạnh khả năng xếp hạng Google.`,
      score: 10,
      priority: 3,
    });
  }

  // ── 6. Từ khoá trong nội dung ───────────────────────────────────────────────
  if (kw && totalWords > 0) {
    const densityPct = density * 100;

    if (densityPct < 0.3) {
      results.push({
        id: 'keyword_density',
        category: 'seo',
        rating: 'bad',
        label: 'Mật độ từ khoá',
        detail: `Mật độ từ khoá "${keyword}" quá thấp (${densityPct.toFixed(2)}%). Hãy nhắc lại tự nhiên trong nội dung, mục tiêu 0.5–2.5%.`,
        score: 2,
        priority: 1,
      });
    } else if (densityPct <= 2.5) {
      results.push({
        id: 'keyword_density',
        category: 'seo',
        rating: 'good',
        label: 'Mật độ từ khoá',
        detail: `Mật độ từ khoá "${keyword}" đạt ${densityPct.toFixed(2)}% — nằm trong khoảng tối ưu (0.5–2.5%), tự nhiên và chuẩn SEO.`,
        score: 10,
        priority: 3,
      });
    } else if (densityPct <= 4) {
      results.push({
        id: 'keyword_density',
        category: 'seo',
        rating: 'ok',
        label: 'Mật độ từ khoá',
        detail: `Mật độ từ khoá "${keyword}" hơi cao (${densityPct.toFixed(2)}%). Google có thể coi là nhồi nhét từ khoá (keyword stuffing). Nên giữ dưới 2.5%.`,
        score: 5,
        priority: 2,
      });
    } else {
      results.push({
        id: 'keyword_density',
        category: 'seo',
        rating: 'bad',
        label: 'Mật độ từ khoá',
        detail: `Mật độ từ khoá "${keyword}" quá cao (${densityPct.toFixed(2)}%) — rủi ro bị Google phạt vì nhồi nhét từ khoá. Hãy giảm và sử dụng từ khoá LSI (đồng nghĩa/liên quan).`,
        score: 2,
        priority: 1,
      });
    }

    // Từ khoá trong đoạn đầu
    const hasKwIntro = keywordInIntro(fullPlain, kw);
    results.push({
      id: 'keyword_in_intro',
      category: 'seo',
      rating: hasKwIntro ? 'good' : 'ok',
      label: 'Từ khoá trong đoạn mở đầu',
      detail: hasKwIntro
        ? `Từ khoá "${keyword}" xuất hiện ngay trong đoạn mở đầu — tín hiệu SEO mạnh, Google ưu tiên cao.`
        : `Từ khoá "${keyword}" chưa xuất hiện trong 200 từ đầu. Hãy đặt từ khoá vào đoạn giới thiệu để Google xác định chủ đề sớm nhất.`,
      score: hasKwIntro ? 9 : 5,
      priority: hasKwIntro ? 3 : 2,
    });
  }

  // ── 7. Heading H1 ───────────────────────────────────────────────────────────
  const h1Tags = headings.filter((h) => h.level === 1);
  if (h1Tags.length === 0) {
    // Không có H1 trong content — kiểm tra title bài viết
    if (title) {
      results.push({
        id: 'h1_check',
        category: 'seo',
        rating: 'ok',
        label: 'Thẻ H1 (Tiêu đề chính)',
        detail: 'Nội dung bài viết không có thẻ H1. Tiêu đề bài viết đang đảm nhận vai trò H1. Nên thêm H1 trong nội dung nếu dùng page builder riêng.',
        score: 6,
        priority: 3,
      });
    } else {
      results.push({
        id: 'h1_check',
        category: 'seo',
        rating: 'bad',
        label: 'Thẻ H1 (Tiêu đề chính)',
        detail: 'Không tìm thấy thẻ H1 trong bài viết. Thẻ H1 là tín hiệu SEO quan trọng nhất — mỗi trang cần đúng một thẻ H1.',
        score: 2,
        priority: 1,
      });
    }
  } else if (h1Tags.length > 1) {
    results.push({
      id: 'h1_check',
      category: 'seo',
      rating: 'bad',
      label: 'Thẻ H1 (Tiêu đề chính)',
      detail: `Bài viết có ${h1Tags.length} thẻ H1 — quá nhiều. Mỗi trang chỉ nên có đúng một H1. Hãy chuyển các H1 thừa thành H2 hoặc H3.`,
      score: 3,
      priority: 1,
    });
  } else {
    const h1Text = h1Tags[0].text.toLowerCase();
    const h1HasKw = kw ? h1Text.includes(kw) : true;
    results.push({
      id: 'h1_check',
      category: 'seo',
      rating: h1HasKw ? 'good' : 'ok',
      label: 'Thẻ H1 (Tiêu đề chính)',
      detail: h1HasKw
        ? `Thẻ H1 duy nhất và chứa từ khoá "${keyword}" — cấu trúc heading chuẩn SEO tốt.`
        : `Chỉ có một thẻ H1 — tốt. Tuy nhiên, H1 chưa chứa từ khoá "${keyword}". Cân nhắc thêm từ khoá vào tiêu đề H1.`,
      score: h1HasKw ? 9 : 6,
      priority: h1HasKw ? 3 : 2,
    });
  }

  // ── 8. Cấu trúc Heading (H2, H3) ────────────────────────────────────────────
  const h2Tags = headings.filter((h) => h.level === 2);
  const h3Tags = headings.filter((h) => h.level === 3);

  if (totalWords > 300) {
    if (h2Tags.length === 0) {
      results.push({
        id: 'heading_structure',
        category: 'seo',
        rating: 'bad',
        label: 'Cấu trúc tiêu đề phụ (H2/H3)',
        detail: 'Bài viết chưa có thẻ H2. Hãy chia nội dung thành các mục bằng H2, giúp Google hiểu cấu trúc và người đọc dễ scan.',
        score: 2,
        priority: 1,
      });
    } else {
      const h2HasKw = kw ? h2Tags.some((h) => h.text.toLowerCase().includes(kw)) : true;
      results.push({
        id: 'heading_structure',
        category: 'seo',
        rating: h2HasKw ? 'good' : 'ok',
        label: 'Cấu trúc tiêu đề phụ (H2/H3)',
        detail: h2HasKw
          ? `${h2Tags.length} thẻ H2${h3Tags.length > 0 ? ` và ${h3Tags.length} thẻ H3` : ''} — cấu trúc phân cấp rõ ràng, từ khoá xuất hiện trong tiêu đề phụ, tuyệt vời.`
          : `Bài viết có ${h2Tags.length} thẻ H2 — tốt. Tuy nhiên, chưa có thẻ H2 nào chứa từ khoá "${keyword}". Thêm từ khoá vào ít nhất một H2.`,
        score: h2HasKw ? 9 : 6,
        priority: h2HasKw ? 3 : 2,
      });
    }
  }

  // ── 9. Hình ảnh ─────────────────────────────────────────────────────────────
  if (images.length === 0) {
    results.push({
      id: 'images',
      category: 'seo',
      rating: 'ok',
      label: 'Hình ảnh trong bài viết',
      detail: 'Bài viết chưa có hình ảnh. Nên thêm ít nhất một ảnh minh hoạ chất lượng cao với thẻ Alt để tăng trải nghiệm và SEO hình ảnh.',
      score: 4,
      priority: 2,
    });
  } else {
    const imagesNoAlt = images.filter((img) => !img.alt || img.alt.trim() === '');
    const imagesWithKwAlt = kw
      ? images.filter((img) => img.alt && img.alt.toLowerCase().includes(kw))
      : [];

    if (imagesNoAlt.length > 0) {
      results.push({
        id: 'image_alt',
        category: 'seo',
        rating: 'bad',
        label: 'Thẻ Alt của hình ảnh',
        detail: `${imagesNoAlt.length}/${images.length} hình ảnh thiếu thẻ Alt. Google đọc thẻ Alt để hiểu nội dung ảnh — đây cũng là cơ hội xuất hiện trong Google Images.`,
        score: 3,
        priority: 1,
      });
    } else if (kw && imagesWithKwAlt.length === 0) {
      results.push({
        id: 'image_alt',
        category: 'seo',
        rating: 'ok',
        label: 'Thẻ Alt của hình ảnh',
        detail: `Tất cả ${images.length} hình ảnh có thẻ Alt — tốt. Tuy nhiên, chưa có ảnh nào có thẻ Alt chứa từ khoá "${keyword}". Hãy thêm từ khoá vào Alt ảnh chính.`,
        score: 6,
        priority: 2,
      });
    } else {
      results.push({
        id: 'image_alt',
        category: 'seo',
        rating: 'good',
        label: 'Thẻ Alt của hình ảnh',
        detail: kw
          ? `Tất cả ${images.length} hình ảnh có thẻ Alt, ${imagesWithKwAlt.length} ảnh có Alt chứa từ khoá — tối ưu SEO hình ảnh xuất sắc.`
          : `Tất cả ${images.length} hình ảnh được trang bị thẻ Alt đầy đủ.`,
        score: 10,
        priority: 3,
      });
    }
  }

  // ── 10. Internal Links ──────────────────────────────────────────────────────
  if (internalLinks.length === 0) {
    results.push({
      id: 'internal_links',
      category: 'seo',
      rating: 'ok',
      label: 'Liên kết nội bộ (Internal Links)',
      detail: 'Bài viết chưa có liên kết nội bộ. Hãy thêm 2–5 liên kết đến các bài viết/trang sản phẩm liên quan để truyền "link juice" và giữ người dùng ở lại.',
      score: 4,
      priority: 2,
    });
  } else {
    results.push({
      id: 'internal_links',
      category: 'seo',
      rating: 'good',
      label: 'Liên kết nội bộ (Internal Links)',
      detail: `Bài viết có ${internalLinks.length} liên kết nội bộ — điều hướng người dùng tốt và giúp Google thu thập thêm nội dung website.`,
      score: 9,
      priority: 3,
    });
  }

  // ── 11. External Links ──────────────────────────────────────────────────────
  if (externalLinks.length === 0) {
    results.push({
      id: 'external_links',
      category: 'seo',
      rating: 'info',
      label: 'Liên kết ngoài (External Links)',
      detail: 'Chưa có liên kết ngoài đến nguồn uy tín. Trích dẫn 1–2 nguồn tin cậy (Wikipedia, báo lớn, tài liệu chính thức) giúp tăng độ tin cậy của bài viết.',
      score: 5,
      priority: 3,
    });
  } else {
    results.push({
      id: 'external_links',
      category: 'seo',
      rating: 'good',
      label: 'Liên kết ngoài (External Links)',
      detail: `Bài viết trích dẫn ${externalLinks.length} nguồn ngoài — tăng tính uy tín và E-E-A-T cho nội dung theo tiêu chí Google.`,
      score: 8,
      priority: 3,
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// READABILITY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function runReadabilityChecks(params: {
  plainContent: string;
  rawContent: string;
  title: string;
  keyword: string;
}): CheckResult[] {
  const { plainContent, rawContent, keyword } = params;
  const results: CheckResult[] = [];
  const kw = normalizeKeyword(keyword);
  const totalWords = countVietnameseWords(plainContent);

  if (totalWords === 0) return results;

  // ── Độ dài đoạn văn ─────────────────────────────────────────────────────────
  const paragraphInfo = countParagraphs(rawContent);
  if (paragraphInfo.count > 0) {
    if (paragraphInfo.longParagraphs > 0) {
      results.push({
        id: 'paragraph_length',
        category: 'readability',
        rating: paragraphInfo.longParagraphs > paragraphInfo.count * 0.5 ? 'bad' : 'ok',
        label: 'Độ dài đoạn văn',
        detail: `${paragraphInfo.longParagraphs}/${paragraphInfo.count} đoạn văn quá dài (>150 từ). Hãy chia nhỏ thành các đoạn 50–100 từ, mỗi đoạn một ý chính để người dùng di động dễ đọc.`,
        score: paragraphInfo.longParagraphs > paragraphInfo.count * 0.5 ? 3 : 5,
        priority: paragraphInfo.longParagraphs > paragraphInfo.count * 0.5 ? 1 : 2,
      });
    } else {
      results.push({
        id: 'paragraph_length',
        category: 'readability',
        rating: 'good',
        label: 'Độ dài đoạn văn',
        detail: `Đoạn văn có độ dài phù hợp (trung bình ~${paragraphInfo.avgWords} từ/đoạn) — dễ đọc trên cả desktop và mobile.`,
        score: 9,
        priority: 3,
      });
    }
  }

  // ── Độ dài câu ──────────────────────────────────────────────────────────────
  const sentences = plainContent.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const sentenceWordCounts = sentences.map((s) => countVietnameseWords(s));
  const avgSentenceWords =
    sentenceWordCounts.length > 0
      ? sentenceWordCounts.reduce((a, b) => a + b, 0) / sentenceWordCounts.length
      : 0;
  const longSentences = sentenceWordCounts.filter((w) => w > 25).length;
  const longSentencePct = sentences.length > 0 ? (longSentences / sentences.length) * 100 : 0;

  if (longSentencePct > 40) {
    results.push({
      id: 'sentence_length',
      category: 'readability',
      rating: 'bad',
      label: 'Độ dài câu văn',
      detail: `${longSentencePct.toFixed(0)}% câu trong bài viết dài hơn 25 từ. Hãy chia câu dài thành 2 câu ngắn để dễ đọc hơn — đặc biệt quan trọng với người dùng mobile.`,
      score: 3,
      priority: 1,
    });
  } else if (longSentencePct > 20) {
    results.push({
      id: 'sentence_length',
      category: 'readability',
      rating: 'ok',
      label: 'Độ dài câu văn',
      detail: `${longSentencePct.toFixed(0)}% câu dài hơn 25 từ — hơi nhiều. Mục tiêu lý tưởng dưới 20% câu dài. Thử rút gọn các câu phức tạp.`,
      score: 5,
      priority: 2,
    });
  } else {
    results.push({
      id: 'sentence_length',
      category: 'readability',
      rating: 'good',
      label: 'Độ dài câu văn',
      detail: `Câu văn ngắn gọn, xúc tích (trung bình ${avgSentenceWords.toFixed(0)} từ/câu). Phong cách viết dễ tiếp cận và thân thiện với người đọc.`,
      score: 9,
      priority: 3,
    });
  }

  // ── Từ chuyển tiếp (Transition words) ──────────────────────────────────────
  const transitionWords = [
    // Liệt kê, bổ sung
    'đầu tiên', 'thứ nhất', 'thứ hai', 'thứ ba', 'cuối cùng', 'ngoài ra', 'bên cạnh đó',
    'hơn nữa', 'đồng thời', 'thêm vào đó', 'cũng như', 'không những', 'không chỉ',
    // Tương phản
    'tuy nhiên', 'mặc dù', 'dù vậy', 'nhưng', 'trái lại', 'ngược lại', 'trong khi đó',
    'mặt khác', 'thế nhưng', 'dẫu vậy',
    // Nguyên nhân, kết quả
    'vì vậy', 'do đó', 'kết quả là', 'vì thế', 'bởi vì', 'vì lý do', 'chính vì',
    'dẫn đến', 'từ đó', 'điều này có nghĩa',
    // Ví dụ, minh hoạ
    'ví dụ', 'chẳng hạn', 'cụ thể là', 'điển hình', 'như là', 'bao gồm',
    // Tóm lại
    'tóm lại', 'tóm tắt', 'kết luận', 'nhìn chung', 'nói chung', 'tổng kết',
    // Thời gian
    'trước tiên', 'sau đó', 'tiếp theo', 'sau khi', 'trước khi', 'trong khi',
    'lúc đầu', 'ban đầu', 'hiện nay', 'hiện tại',
  ];

  const lowerContent = plainContent.toLowerCase();
  const foundTransitions = transitionWords.filter((tw) => lowerContent.includes(tw));
  const transitionDensity = sentences.length > 0
    ? (foundTransitions.length / sentences.length) * 100
    : 0;

  if (foundTransitions.length < 3) {
    results.push({
      id: 'transition_words',
      category: 'readability',
      rating: 'ok',
      label: 'Từ liên kết & chuyển tiếp',
      detail: `Bài viết sử dụng ít từ liên kết/chuyển tiếp (${foundTransitions.length} từ). Hãy thêm các từ như "tuy nhiên", "vì vậy", "bên cạnh đó", "kết luận" để tạo mạch văn logic và dễ theo dõi.`,
      score: 4,
      priority: 2,
    });
  } else {
    results.push({
      id: 'transition_words',
      category: 'readability',
      rating: 'good',
      label: 'Từ liên kết & chuyển tiếp',
      detail: `Bài viết sử dụng ${foundTransitions.length} từ liên kết (${foundTransitions.slice(0, 4).join(', ')}…) — mạch văn logic, dễ theo dõi, tăng điểm đọc hiểu.`,
      score: 9,
      priority: 3,
    });
  }

  // ── Phân phối Heading trong nội dung ────────────────────────────────────────
  const headings = extractHeadings(rawContent);
  const h2Count = headings.filter((h) => h.level === 2).length;

  if (totalWords > 600 && h2Count < 2) {
    results.push({
      id: 'subheading_distribution',
      category: 'readability',
      rating: 'bad',
      label: 'Phân bổ tiêu đề phụ',
      detail: `Bài viết ${totalWords} từ chỉ có ${h2Count} thẻ H2. Nên có ít nhất 1 H2 mỗi 200–300 từ để chia bố cục rõ ràng, giúp người đọc scan nhanh và Google index tốt hơn.`,
      score: 3,
      priority: 1,
    });
  } else if (h2Count >= 2) {
    results.push({
      id: 'subheading_distribution',
      category: 'readability',
      rating: 'good',
      label: 'Phân bổ tiêu đề phụ',
      detail: `Bài viết có ${h2Count} thẻ H2 phân bổ đều — cấu trúc rõ ràng, dễ đọc, thân thiện với thuật toán Google.`,
      score: 9,
      priority: 3,
    });
  }

  // ── Câu chủ động / bị động ──────────────────────────────────────────────────
  const passiveIndicators = [
    'được làm', 'bị làm', 'đã được', 'đang được', 'sẽ được', 'bị thực hiện',
    'được thực hiện', 'được sản xuất', 'bị ảnh hưởng', 'được ảnh hưởng',
    'được cung cấp', 'bị cung cấp', 'được tạo ra', 'bị tạo ra',
  ];
  const passiveCount = passiveIndicators.filter((p) => lowerContent.includes(p)).length;

  if (passiveCount >= 4) {
    results.push({
      id: 'passive_voice',
      category: 'readability',
      rating: 'ok',
      label: 'Câu chủ động / bị động',
      detail: 'Bài viết sử dụng khá nhiều câu bị động. Hãy ưu tiên câu chủ động để văn phong năng động, trực tiếp và dễ hiểu hơn với người đọc.',
      score: 5,
      priority: 2,
    });
  } else {
    results.push({
      id: 'passive_voice',
      category: 'readability',
      rating: 'good',
      label: 'Câu chủ động / bị động',
      detail: 'Phần lớn bài viết sử dụng câu chủ động — văn phong tự nhiên, mạch lạc, dễ tiếp nhận.',
      score: 9,
      priority: 3,
    });
  }

  // ── Danh sách (bullet/number list) ─────────────────────────────────────────
  const hasList = /<ul|<ol|<li/i.test(rawContent);
  if (!hasList && totalWords > 500) {
    results.push({
      id: 'use_lists',
      category: 'readability',
      rating: 'info',
      label: 'Sử dụng danh sách',
      detail: 'Bài viết chưa có danh sách (bullet/số thứ tự). Với bài dài, sử dụng danh sách để liệt kê các bước, tính năng, lợi ích — giúp người đọc nắm bắt nhanh và Google trích dẫn vào Featured Snippet.',
      score: 5,
      priority: 2,
    });
  } else if (hasList) {
    results.push({
      id: 'use_lists',
      category: 'readability',
      rating: 'good',
      label: 'Sử dụng danh sách',
      detail: 'Bài viết có danh sách bullet/số — trình bày cấu trúc rõ ràng, tăng khả năng Google trích dẫn vào hộp Featured Snippet.',
      score: 8,
      priority: 3,
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function overallLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'Tốt', color: 'text-emerald-600' };
  if (score >= 50) return { text: 'Trung bình', color: 'text-amber-500' };
  return { text: 'Cần cải thiện', color: 'text-rose-600' };
}

function overallGradient(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-emerald-600';
  if (score >= 50) return 'from-amber-400 to-amber-500';
  return 'from-rose-500 to-rose-600';
}

function overallStroke(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SeoAnalyzer({
  title,
  slug,
  summary,
  content,
  seoTitle,
  seoDescription,
  seoKeywords,
}: SeoAnalyzerProps) {
  const [seoResults, setSeoResults] = useState<CheckResult[]>([]);
  const [readabilityResults, setReadabilityResults] = useState<CheckResult[]>([]);
  const [seoScore, setSeoScore] = useState(0);
  const [readabilityScore, setReadabilityScore] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'seo' | 'readability'>('seo');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const plainSummary = useMemo(() => stripHtml(summary), [summary]);
  const plainContent = useMemo(() => stripHtml(content), [content]);

  const focusKeyword = useMemo(() => {
    if (!seoKeywords) return '';
    return seoKeywords.split(',')[0]?.toLowerCase().trim() ?? '';
  }, [seoKeywords]);

  const hasContent = Boolean(title || content || seoTitle);

  const runAnalysis = useCallback(() => {
    if (!hasContent) return;
    setIsAnalyzing(true);

    // Dùng setTimeout 0 để không block UI
    setTimeout(() => {
      try {
        const kw = normalizeKeyword(focusKeyword);
        const fullPlain = [plainContent, plainSummary].filter(Boolean).join(' ');

        const seoChecks = runSeoChecks({
          title,
          slug,
          plainSummary,
          plainContent: fullPlain,
          rawContent: content,
          seoTitle,
          seoDescription,
          keyword: kw,
        });

        const readChecks = runReadabilityChecks({
          plainContent: fullPlain,
          rawContent: content,
          title,
          keyword: kw,
        });

        // Sắp xếp: bad → ok → info → good
        const sortOrder: Record<Rating, number> = { bad: 0, ok: 1, info: 2, good: 3 };
        const sortFn = (a: CheckResult, b: CheckResult) =>
          sortOrder[a.rating] - sortOrder[b.rating] || a.priority - b.priority;

        const sortedSeo = [...seoChecks].sort(sortFn);
        const sortedRead = [...readChecks].sort(sortFn);

        setSeoResults(sortedSeo);
        setReadabilityResults(sortedRead);
        setSeoScore(calcOverallScore(seoChecks));
        setReadabilityScore(calcOverallScore(readChecks));
      } catch (err) {
        console.error('[SeoAnalyzer]', err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 0);
  }, [title, slug, plainSummary, plainContent, content, seoTitle, seoDescription, focusKeyword, hasContent]);

  // Auto-analyze với debounce 700ms
  useEffect(() => {
    if (!hasContent) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runAnalysis, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runAnalysis, hasContent]);

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderScoreCircle = (score: number, label: string, id: string) => {
    const pct = Math.min(100, Math.max(0, score));
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - pct / 100);
    const { text, color } = overallLabel(score);

    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative h-[96px] w-[96px]">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96">
            <defs>
              <linearGradient id={`grad_${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={overallStroke(score)} stopOpacity="0.6" />
                <stop offset="100%" stopColor={overallStroke(score)} />
              </linearGradient>
            </defs>
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="7" />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke={`url(#grad_${id})`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-extrabold leading-none text-slate-900">{pct}</span>
            <span className="text-[9px] font-medium text-slate-400">/100</span>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">{label}</span>
        <span className={`text-[11px] font-semibold ${color}`}>{text}</span>
      </div>
    );
  };

  const renderItem = (item: CheckResult) => {
    const cfg = RATING_CFG[item.rating];
    return (
      <div
        key={item.id}
        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${cfg.border} ${cfg.bg}`}
      >
        <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={`text-[12px] font-bold ${cfg.text}`}>{item.label}</span>
          </div>
          <p
            className={`mt-0.5 text-[12px] leading-relaxed ${cfg.text} opacity-90`}
            dangerouslySetInnerHTML={{ __html: item.detail }}
          />
        </div>
        <span className={`shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>
    );
  };

  const renderSection = (results: CheckResult[], score: number) => {
    const bad = results.filter((r) => r.rating === 'bad').length;
    const ok = results.filter((r) => r.rating === 'ok').length;
    const good = results.filter((r) => r.rating === 'good').length;
    const info = results.filter((r) => r.rating === 'info').length;

    return (
      <div className="space-y-3">
        {/* Thanh tiến trình */}
        <div className="flex items-center gap-3">
          <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-1.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${overallGradient(score)} transition-all duration-500`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-slate-500">{score}/100</span>
        </div>

        {/* Thống kê nhanh */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {bad > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {bad} chưa đạt
            </span>
          )}
          {ok > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {ok} cần cải thiện
            </span>
          )}
          {info > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {info} gợi ý
            </span>
          )}
          {good > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {good} đạt
            </span>
          )}
        </div>

        {/* Danh sách kết quả */}
        <div className="space-y-2">
          {results.length > 0 ? (
            results.map(renderItem)
          ) : (
            <p className="py-3 text-center text-[12px] italic text-slate-400">
              Đang khởi tạo phân tích…
            </p>
          )}
        </div>
      </div>
    );
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!hasContent) {
    return (
      <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-[13px] font-bold text-slate-800">
          Kiểm tra SEO Realtime
        </div>
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-[13px] text-slate-400">Nhập tiêu đề và nội dung để bắt đầu phân tích SEO</p>
        </div>
      </div>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-bold text-slate-800">Kiểm tra SEO Realtime</h2>
          {isAnalyzing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-medium text-sky-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
              Đang phân tích…
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="inline-flex h-8 items-center gap-1.5 border border-sky-600 bg-sky-600 px-3 text-[11px] font-semibold text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Phân tích lại
        </button>
      </div>

      <div className="space-y-5 p-4">
        {/* Score circles */}
        <div className="flex items-center justify-center gap-10 rounded-xl border border-slate-100 bg-slate-50/60 px-6 py-5">
          {renderScoreCircle(seoScore, 'SEO Score', 'seo')}
          <div className="h-16 w-px bg-slate-200" />
          {renderScoreCircle(readabilityScore, 'Readability', 'read')}
        </div>

        {/* Focus keyword badge */}
        {focusKeyword && (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2">
            <svg className="h-3.5 w-3.5 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span className="text-[12px] text-indigo-700">
              <span className="font-semibold">Từ khoá trọng tâm: </span>
              <span className="font-bold underline decoration-indigo-300">{focusKeyword}</span>
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-[12px] font-semibold transition-colors ${
              activeTab === 'seo'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Phân tích SEO
            <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
              {seoResults.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('readability')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-[12px] font-semibold transition-colors ${
              activeTab === 'readability'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Dễ đọc (Readability)
            <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
              {readabilityResults.length}
            </span>
          </button>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'seo'
            ? renderSection(seoResults, seoScore)
            : renderSection(readabilityResults, readabilityScore)}
        </div>

        {/* Footer hint */}
        <p className="text-center text-[11px] text-slate-400">
          Phát triển bởi <a href="" target="_blank" rel="noopener noreferrer">Nhật Nam</a>
        </p>
      </div>
    </div>
  );
}