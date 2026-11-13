import { describe, expect, it } from 'vitest'
import { toSponsoredProduct } from '../lib/advertising'

describe('sponsored product offer mapping', () => {
  it('preserves the exact advertised public offer and its marketplace details', () => {
    const product = toSponsoredProduct({
      campaign_offer_id: 71,
      public_product_id: 204,
      slug: 'esp32-wroom-trader-a',
      name: 'ESP32-WROOM-32',
      image: 'https://images.example.test/esp32.jpg',
      price: '35000.00',
      category: 'Development Boards',
      category_slug: 'development-boards',
    })

    expect(product).toMatchObject({
      id: 204,
      slug: 'esp32-wroom-trader-a',
      name: 'ESP32-WROOM-32',
      price: 35000,
      image: 'https://images.example.test/esp32.jpg',
      category: 'development-boards',
      categoryName: 'Development Boards',
      stock: 0,
    })
  })
})
