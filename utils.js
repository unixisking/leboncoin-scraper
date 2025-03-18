export default class Utils {
  static cleanPrice(price) {
    if (price) {
      price = price.replace('\u202f', '').replace('\xa0', ' ') // Remove unicode characters
    }
    return price
  }
}
