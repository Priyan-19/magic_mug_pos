class Product {
  final int id;
  final String name;
  final String? description;
  final double price;
  final int categoryId;
  final String? categoryName;
  final String? imageUrl;
  final bool isActive;
  final bool isPopular;

  Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    required this.categoryId,
    this.categoryName,
    this.imageUrl,
    required this.isActive,
    this.isPopular = false,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      description: json['description'],
      price: (json['selling_price'] is num)
          ? (json['selling_price'] as num).toDouble()
          : (json['price'] is num)
              ? (json['price'] as num).toDouble()
              : double.tryParse('${json['selling_price'] ?? json['price']}') ?? 0.0,
      categoryId: json['category_id'] ?? 0,
      categoryName: json['category_name'],
      imageUrl: json['image_url'],
      isActive: json['is_active'] ?? true,
      isPopular: json['is_popular'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'price': price,
    'category_id': categoryId,
    'image_url': imageUrl,
    'is_active': isActive,
    'is_popular': isPopular,
  };
}
