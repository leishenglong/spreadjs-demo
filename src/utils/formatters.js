import * as GC from '@grapecity-software/spread-sheets'

/**
 * 创建脱敏格式化器函数构造器
 * 用于在填报阶段对敏感数据进行脱敏显示
 *
 * 使用方式:
 * const formatter = createMaskFormatter('phone')
 * sheet.getCell(0, 0).formatter(formatter)
 */
function MaskFormatter(maskType = 'phone') {
  // 调用基类构造器
  GC.Spread.Formatter.FormatterBase.apply(this, arguments)

  this.typeName = 'MaskFormatter'
  this.maskType = maskType // phone, idcard, email, card, custom
}

// 设置原型链继承
MaskFormatter.prototype = new GC.Spread.Formatter.FormatterBase()

/**
 * 格式化显示 - 将真实值转换为脱敏显示
 */
MaskFormatter.prototype.format = function (obj, options) {
  if (!obj) return ''

  const str = String(obj)

  switch (this.maskType) {
    case 'phone':
      return this.maskPhone(str)
    case 'idcard':
      return this.maskIdCard(str)
    case 'email':
      return this.maskEmail(str)
    case 'card':
      return this.maskCard(str)
    case 'custom':
      return this.maskCustom(str)
    default:
      return str
  }
}

/**
 * 解析输入 - 将用户输入转换为真实存储值
 * 脱敏场景下通常不允许编辑，返回原始值
 */
MaskFormatter.prototype.parse = function (str) {
  return str
}

/**
 * 手机号脱敏：13915597994 -> 139*******4
 */
MaskFormatter.prototype.maskPhone = function (str) {
  if (str.length <= 7) return str
  const start = str.substring(0, 3)
  const end = str.substring(str.length - 2)
  const middle = '*'.repeat(str.length - 5)
  return start + middle + end
}

/**
 * 身份证脱敏：320621199001011234 -> 320621********1234
 */
MaskFormatter.prototype.maskIdCard = function (str) {
  if (str.length <= 8) return str
  const start = str.substring(0, 6)
  const end = str.substring(str.length - 4)
  const middle = '*'.repeat(str.length - 10)
  return start + middle + end
}

/**
 * 邮箱脱敏：example@gmail.com -> e******@gmail.com
 */
MaskFormatter.prototype.maskEmail = function (str) {
  const atIndex = str.indexOf('@')
  if (atIndex <= 1) return str
  const first = str.substring(0, 1)
  const domain = str.substring(atIndex)
  const middle = '*'.repeat(atIndex - 1)
  return first + middle + domain
}

/**
 * 银行卡脱敏：6222021234567890 -> 622202*******890
 */
MaskFormatter.prototype.maskCard = function (str) {
  if (str.length <= 10) return str
  const start = str.substring(0, 6)
  const end = str.substring(str.length - 3)
  const middle = '*'.repeat(str.length - 9)
  return start + middle + end
}

/**
 * 自定义脱敏：保留前后各2位
 */
MaskFormatter.prototype.maskCustom = function (str) {
  if (str.length <= 4) return str
  const start = str.substring(0, 2)
  const end = str.substring(str.length - 2)
  const middle = '*'.repeat(str.length - 4)
  return start + middle + end
}

/**
 * 序列化方法 - 用于保存模板时序列化格式化器
 */
MaskFormatter.prototype.toJSON = function () {
  return {
    typeName: this.typeName,
    maskType: this.maskType
  }
}

/**
 * 反序列化方法 - 用于加载模板时恢复格式化器
 */
MaskFormatter.prototype.fromJSON = function (settings) {
  if (settings) {
    this.maskType = settings.maskType || 'phone'
  }
}

/**
 * 创建脱敏格式化器实例
 * @param {string} maskType - 脱敏类型: phone, idcard, email, card, custom
 * @returns {MaskFormatter} 格式化器实例
 */
export function createMaskFormatter(maskType = 'phone') {
  return new MaskFormatter(maskType)
}

/**
 * 注册脱敏格式化器到 SpreadJS
 * 注意：使用函数构造器方式不需要额外注册
 */
export function registerMaskFormatter() {
  // 使用函数构造器方式，不需要手动注册
  // SpreadJS 会自动通过 prototype 和 typeName 识别格式化器
}

/**
 * 从设置恢复脱敏格式化器
 * @param {Object} settings - 序列化的设置对象
 * @returns {MaskFormatter} 格式化器实例
 */
export function restoreMaskFormatter(settings) {
  if (settings && settings.typeName === 'MaskFormatter') {
    const formatter = new MaskFormatter(settings.maskType || 'phone')
    return formatter
  }
  return null
}
