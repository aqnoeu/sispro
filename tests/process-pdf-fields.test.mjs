import test from 'node:test'
import assert from 'node:assert/strict'
import {extractProcessFields} from '../src/utils/processPdfFields.js'
test('extracts explicitly labeled data without guessing a deadline',()=>{const result=extractProcessFields('Processo: 0000001-00.2026.8.08.0011\nAutor: Parte fictícia\nAssunto: Saúde\nÓrgão julgador: Vara de Teste\nFase: Conhecimento\nIntimação em 20/11/2026\nPrazo de 15 dias');assert.equal(result.fields.numero,'0000001-00.2026.8.08.0011');assert.equal(result.fields.parte,'Parte fictícia');assert.equal(result.fields.orgao,'Vara de Teste');assert.equal(result.fields.prazo,undefined)})
test('explicit deadline only; impossible and conflicting dates omitted',()=>{assert.equal(extractProcessFields('Vencimento: 30/11/2026').fields.prazo,'30/11/2026');assert.equal(extractProcessFields('Vencimento: 31/02/2026').fields.prazo,undefined);assert.equal(extractProcessFields('Vencimento: 30/11/2026\nPrazo final: 01/12/2026').fields.prazo,undefined)})
test('multiple unlabeled process numbers are not guessed',()=>{assert.equal(extractProcessFields('0000001-00.2026.8.08.0011\n0000002-00.2026.8.08.0011').fields.numero,undefined)})
