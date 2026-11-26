/** 对齐两个序列：返回按顺序排列的相同 / 删除 / 新增操作 */
export function align<T>(
  a: T[],
  b: T[],
  same: (x: T, y: T) => boolean = (x, y) => x === y
): { op: 'eq' | 'del' | 'add'; a?: number; b?: number }[] {
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  )
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = same(a[i], b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
  const ops: { op: 'eq' | 'del' | 'add'; a?: number; b?: number }[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (same(a[i], b[j])) ops.push({ op: 'eq', a: i++, b: j++ })
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ op: 'del', a: i++ })
    else ops.push({ op: 'add', b: j++ })
  }
  while (i < n) ops.push({ op: 'del', a: i++ })
  while (j < m) ops.push({ op: 'add', b: j++ })
  return ops
}
