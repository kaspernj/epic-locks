export default function awaitTimeout(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout)
  })
}
