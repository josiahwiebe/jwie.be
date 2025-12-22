export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 }).format(Math.round(num * 100) / 100)
}
