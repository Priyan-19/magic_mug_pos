class Category {
  final int id;
  final String name;
  final String? description;
  final int sortOrder;
  final bool isActive;
  final int productCount;

  Category({
    required this.id,
    required this.name,
    this.description,
    required this.sortOrder,
    required this.isActive,
    this.productCount = 0,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      description: json['description'],
      sortOrder: json['display_order'] ?? json['sort_order'] ?? 0,
      isActive: json['is_active'] ?? true,
      productCount: json['product_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'sort_order': sortOrder,
    'is_active': isActive,
  };
}
