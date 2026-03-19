export interface ProductGroup {
  id: number;
  nameVi: string; // TÊN NHÓM
  nameEn: string; // TÊN TIẾNG ANH
  imageUrl?: string | null; // HÌNH ẢNH
  displayType: 0 | 1 | 2; // KIỂU HIỂN THỊ
  slideType: 0 | 1 | 2; // KIỂU SLIDES
  sortOrder: number; // THỨ TỰ
  sortOrderNew: number; // THỨ TỰ NEW
}
