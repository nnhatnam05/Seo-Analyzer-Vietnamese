# 🇻🇳 Vietnamese SEO Analyzer

<div align="center">

# Vietnamese SEO Analyzer

### Công cụ phân tích SEO Realtime tối ưu riêng cho tiếng Việt

Phân tích SEO trực tiếp trên trình duyệt • Không phụ thuộc API • Không sử dụng YoastSEO • Tối ưu cho thị trường Việt Nam

<br/>

![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![React](https://img.shields.io/badge/React-18+-61DAFB)
![License](https://img.shields.io/badge/License-MIT-green)
![Vietnamese SEO](https://img.shields.io/badge/Vietnamese-SEO-red)
![Open Source](https://img.shields.io/badge/Open%20Source-Community-orange)

</div>

---

## 📖 Giới thiệu

**Vietnamese SEO Analyzer** là một thư viện phân tích SEO được xây dựng hoàn toàn từ đầu dành riêng cho tiếng Việt.

Khác với các công cụ SEO phổ biến như:

* Yoast SEO
* Rank Math
* AIO SEO
* Surfer SEO

được tối ưu chủ yếu cho tiếng Anh, dự án này được thiết kế để xử lý chính xác cấu trúc ngôn ngữ tiếng Việt và hành vi tìm kiếm của người dùng Việt Nam.

---

## ✨ Tính năng nổi bật

### 🔍 SEO Analysis

Kiểm tra tự động:

* SEO Title
* Meta Description
* URL Slug
* Focus Keyword
* Keyword Density
* Keyword Placement
* H1 Validation
* H2 / H3 Structure
* Image ALT Tags
* Internal Links
* External Links
* Content Length
* SEO Score

---

### 📚 Readability Analysis

Đánh giá khả năng đọc:

* Độ dài câu
* Độ dài đoạn văn
* Từ chuyển tiếp
* Mật độ heading
* Danh sách bullet
* Câu chủ động / bị động
* Readability Score

---

### 🇻🇳 Tối ưu riêng cho tiếng Việt

Hỗ trợ:

✅ Unicode tiếng Việt

✅ HTML Entity tiếng Việt

✅ CKEditor

✅ TinyMCE

✅ HTML Content

✅ Keyword tiếng Việt có dấu

✅ Keyword nhiều từ

Ví dụ:

```text
thi công nhà xưởng
```

```text
thiết kế nhà máy
```

```text
xây dựng nhà thép tiền chế
```

Đều được phân tích chính xác.

---

## 🚀 Điểm khác biệt

| Tính năng   | Yoast | RankMath | Vietnamese SEO Analyzer |
| ----------- | ----- | -------- | ----------------------- |
| Tiếng Việt  | ⚠️    | ⚠️       | ✅                       |
| Open Source | ❌     | ❌        | ✅                       |
| Không API   | ❌     | ❌        | ✅                       |
| Tùy biến    | ⚠️    | ⚠️       | ✅                       |
| React Ready | ❌     | ❌        | ✅                       |
| CMS Custom  | ⚠️    | ⚠️       | ✅                       |

---

## 🏗 Kiến trúc

```text
Content
   │
   ▼

HTML Parser
   │
   ▼

SEO Engine
   │
   ├── Title Analysis
   ├── Meta Analysis
   ├── Keyword Analysis
   ├── Heading Analysis
   ├── Link Analysis
   └── Image Analysis

   ▼

Readability Engine
   │
   ├── Sentence Analysis
   ├── Paragraph Analysis
   ├── Transition Words
   └── Readability Score

   ▼

Realtime Report
```

---

## ⚡ Hiệu năng

* Debounce 700ms
* Không request API
* Không xử lý server
* Chạy hoàn toàn client-side
* Phân tích realtime

Ngay cả bài viết:

```text
3000+ từ
50+ heading
20+ hình ảnh
```

vẫn cho tốc độ phản hồi tức thì.

---

## 📦 Cài đặt

### Copy Component

```bash
SeoAnalyzer.tsx
```

### Import

```tsx
import SeoAnalyzer from '@/components/SeoAnalyzer';
```

### Sử dụng

```tsx
<SeoAnalyzer
  title={title}
  slug={slug}
  summary={summary}
  content={content}
  seoTitle={seoTitle}
  seoDescription={seoDescription}
  seoKeywords={seoKeywords}
/>
```

---

## 📋 Props

| Prop           | Type   |
| -------------- | ------ |
| title          | string |
| slug           | string |
| summary        | string |
| content        | string |
| seoTitle       | string |
| seoDescription | string |
| seoKeywords    | string |

---

## 📊 SEO Checks

Hiện tại công cụ hỗ trợ:

### SEO

* Focus Keyword
* Keyword Density
* Keyword In SEO Title
* Keyword In Meta Description
* Keyword In URL
* Keyword In Introduction
* SEO Title Length
* Meta Description Length
* Content Length
* Heading Structure
* H1 Validation
* H2 Validation
* Image Alt
* Internal Links
* External Links

### Readability

* Sentence Length
* Paragraph Length
* Transition Words
* Passive Voice
* Subheading Distribution
* List Detection

---

## 🛠 Công nghệ sử dụng

* React
* TypeScript
* TailwindCSS
* Native SEO Engine

Không sử dụng:

* OpenAI
* Google NLP
* YoastSEO
* RankMath
* SurferSEO

---

## 🎯 Đối tượng sử dụng

Phù hợp cho:

### CMS

* Laravel CMS
* NextJS CMS
* React CMS
* Headless CMS

### Website

* Blog
* Tin tức
* Doanh nghiệp
* Landing Page
* E-Commerce

---

## 🗺 Roadmap

### Version 2.0

* [ ] Semantic SEO
* [ ] Keyword Synonym Detection
* [ ] NLP Vietnamese
* [ ] FAQ Detection
* [ ] Schema Detection
* [ ] Featured Snippet Analysis

### Version 3.0

* [ ] Search Intent Analysis
* [ ] EEAT Analysis
* [ ] Content Gap Analysis
* [ ] AI Content Detection
* [ ] Competitor Analysis

---

## 🤝 Đóng góp

Mọi Pull Request đều được chào đón.

### Quy trình

```bash
# Fork Repository

# Clone
git clone https://github.com/yourname/vietnamese-seo-analyzer.git

# Create Branch
git checkout -b feature/new-feature

# Commit
git commit -m "Add new feature"

# Push
git push origin feature/new-feature
```

Sau đó tạo Pull Request.

---

## ⭐ Hỗ trợ dự án

Nếu dự án hữu ích:

* Star Repository
* Fork Repository
* Chia sẻ cho cộng đồng
* Đóng góp mã nguồn

Điều đó giúp dự án tiếp tục phát triển và phục vụ tốt hơn cho cộng đồng SEO Việt Nam.

---

## 📄 License

MIT License

Bạn có thể:

* Sử dụng cá nhân
* Sử dụng thương mại
* Chỉnh sửa
* Phân phối lại
* Tích hợp vào sản phẩm riêng

---

## 👨‍💻 Tác giả

### Nhật Nam

Full Stack Developer • SEO Enthusiast • Open Source Contributor

---

<div align="center">

### 🇻🇳 Made with ❤️ for Vietnamese Developers & SEO Community

Nếu bạn tin rằng SEO tiếng Việt xứng đáng có những công cụ tốt hơn, hãy cùng đóng góp cho dự án.

⭐ Star Repository để ủng hộ dự án.

</div>
