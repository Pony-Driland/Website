export default function isDebug() {
  return process.env.NODE_ENV !== 'production' && !process.pkg;
}
