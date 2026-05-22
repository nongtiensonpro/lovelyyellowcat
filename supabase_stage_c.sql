-- ==========================================================
-- GIAI ĐOẠN C: TÌM KIẾM, KHÁM PHÁ & SEO
-- Tệp SQL khởi tạo Hàm RPC tìm kiếm bài viết liên quan (Related Articles)
-- Sửa lỗi cú pháp ANY operator construct của PostgreSQL
-- ==========================================================

create or replace function public.get_related_articles(p_slug text, p_limit int default 3)
returns setof public.articles
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select a.*
  from public.articles a
  cross join public.articles source
  where source.slug = p_slug
    and a.slug != p_slug
    and a.status = 'published'
    and a.tags && source.tags   -- Toán tử && kiểm tra có ít nhất 1 nhãn dán trùng nhau
  order by (
    select pg_catalog.count(*)
    from pg_catalog.unnest(a.tags) t
    where t = any(source.tags)  -- Sử dụng toán tử ANY chuẩn của PostgreSQL
  ) desc,                       -- Sắp xếp ưu tiên các bài viết có nhiều nhãn dán trùng nhau hơn
  a.published_at desc
  limit p_limit;
$$;
