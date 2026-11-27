import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const sha = process.env.PREVIOUS_SHA
const parse = value => {
  if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error('Versão numérica inválida: ' + value)
  return value.split('.').map(Number)
}
const current = JSON.parse(readFileSync('package.json', 'utf8')).version
const next = parse(current)
if (sha && !/^0+$/.test(sha)) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Commit anterior inválido')
  const previous = JSON.parse(execFileSync('git', ['show', sha + ':package.json'], { encoding: 'utf8' })).version
  const old = parse(previous)
  const first = next.findIndex((n, i) => n !== old[i])
  if (first === -1 || next[first] < old[first]) throw new Error('Incremente package.json: ' + previous + ' -> ' + current)
  console.log('Versão: ' + previous + ' -> ' + current)
}
