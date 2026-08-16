export interface User {
  _id: string; name: string; email: string; role: 'customer' | 'admin'
  phone?: string; avatar?: string; isProtected?: boolean
}
export interface UserProfile extends User {
  addresses: Address[]; wishlist: Product[]
  createdAt: string; updatedAt: string
}
export interface Product {
  _id: string; name: string; slug: string; description: string
  price: number; comparePrice?: number; images: string[]
  category: { _id: string; name: string; slug: string }
  tags: string[]; stock: number; sold: number; rating: number; numReviews: number
  isFeatured: boolean; isActive: boolean; createdAt: string
  variants?: { name: string; options: { label: string; priceAdjust: number; stock: number }[] }[]
}
export interface CartItem {
  _id: string; product: { _id: string; name: string; price: number; images: string[]; stock: number; slug: string }
  quantity: number; price: number; variant?: { name: string; label: string }
}
export interface Cart { _id: string; items: CartItem[]; total: number }
export interface StatusEntry {
  status: string; timestamp: string; note?: string
}

export interface Order {
  _id: string; items: OrderItem[]; total: number; subtotal: number
  shippingCost: number; discount: number; couponCode?: string
  orderStatus: string; paymentStatus: string; createdAt: string
  statusHistory?: StatusEntry[]
  trackingNumber?: string
  shippingAddress: { label: string; street: string; city: string; state: string; zip: string; country: string }
}
export interface OrderItem {
  product: string; name: string; image: string; quantity: number; price: number
  variant?: { name: string; label: string }
}
export interface Address {
  _id: string; label: string; street: string; city: string; state: string; zip: string; country: string; isDefault: boolean
}
export interface Review {
  _id: string; user: { _id: string; name: string; avatar?: string }
  rating: number; title?: string; comment?: string; images: string[]
  isVerifiedPurchase: boolean; createdAt: string
}
export interface Coupon {
  _id: string; code: string; type: 'percentage' | 'fixed'; value: number
  minOrderAmount?: number; maxDiscount?: number; usageLimit: number; usedCount: number
  expiresAt: string; isActive: boolean
}
export interface Notification {
  _id: string; nid: number; type: 'order' | 'promotion' | 'system'
  title: string; message: string; isRead: boolean; createdAt: string
}
export interface AdminStats {
  totalUsers: number; totalProducts: number; totalOrders: number
  totalRevenue: number; monthlyRevenue: number
  ordersByStatus: { status: string; count: number }[]
  topProducts: Product[]
}
export interface Category {
  _id: string; name: string; slug: string; description?: string
  image?: string; parent?: string; isActive: boolean
}
export type ChallengeType = 'black-box' | 'white-box' | 'grey-box'
export interface Challenge {
  _id: string; key: string; name: string; description: string
  category: string; difficulty: number; challengeType: ChallengeType
  tags: string[]; owaspCategory: string; cwe: string
  endpoint: string; httpMethod: string
}
