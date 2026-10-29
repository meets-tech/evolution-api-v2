import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeBaileysMessageContent, normalizeLidMessageKey } from '../src/utils/lidMessageKey';

function mappingStore(resolutions: Record<string, string | null> = {}) {
  const stored: Array<{ lid: string; pn: string }> = [];
  return {
    stored,
    adapter: {
      resolve: async (lid: string) => resolutions[lid] ?? null,
      store: async (pairs: Array<{ lid: string; pn: string }>) => {
        stored.push(...pairs);
      },
    },
  };
}

test('normaliza LID remoto quando o evento traz o telefone alternativo', async () => {
  const store = mappingStore();
  const key = await normalizeLidMessageKey(
    {
      id: 'message-1',
      remoteJid: '123456789@lid',
      remoteJidAlt: '5511999999999@s.whatsapp.net',
    },
    store.adapter,
  );

  assert.equal(key.remoteJid, '5511999999999@s.whatsapp.net');
  assert.equal(key.remoteJidAlt, '123456789@lid');
  assert.deepEqual(store.stored, [{ lid: '123456789@lid', pn: '5511999999999@s.whatsapp.net' }]);
});

test('normaliza LID remoto usando o mapeamento persistido do Baileys', async () => {
  const store = mappingStore({ '123456789@lid': '5511888888888:4@s.whatsapp.net' });
  const key = await normalizeLidMessageKey({ remoteJid: '123456789@lid' }, store.adapter);

  assert.equal(key.remoteJid, '5511888888888@s.whatsapp.net');
  assert.equal(key.remoteJidAlt, '123456789@lid');
  assert.deepEqual(store.stored, [{ lid: '123456789@lid', pn: '5511888888888@s.whatsapp.net' }]);
});

test('normaliza participante LID sem alterar o identificador do grupo', async () => {
  const store = mappingStore();
  const key = await normalizeLidMessageKey(
    {
      remoteJid: '120363000000000000@g.us',
      participant: '987654321@lid',
      participantAlt: '5511777777777@s.whatsapp.net',
    },
    store.adapter,
  );

  assert.equal(key.remoteJid, '120363000000000000@g.us');
  assert.equal(key.participant, '5511777777777@s.whatsapp.net');
  assert.equal(key.participantAlt, '987654321@lid');
});

test('preserva LID quando o Baileys ainda não possui o número real', async () => {
  const store = mappingStore();
  const key = await normalizeLidMessageKey({ remoteJid: '123456789@lid' }, store.adapter);

  assert.equal(key.remoteJid, '123456789@lid');
  assert.equal(key.remoteJidAlt, undefined);
  assert.deepEqual(store.stored, []);
});

test('não troca dois identificadores LID nem associa um contato por aproximação', async () => {
  const store = mappingStore();
  const key = await normalizeLidMessageKey(
    { remoteJid: '123456789@lid', remoteJidAlt: '987654321@lid' },
    store.adapter,
  );

  assert.equal(key.remoteJid, '123456789@lid');
  assert.equal(key.remoteJidAlt, '987654321@lid');
  assert.deepEqual(store.stored, []);
});

test('recupera o texto dentro de uma mensagem efêmera do Baileys', () => {
  const message = normalizeBaileysMessageContent({
    ephemeralMessage: {
      message: { conversation: 'Conteúdo real' },
    },
  });

  assert.equal(message?.conversation, 'Conteúdo real');
});

test('recupera a mídia dentro de uma mensagem de visualização única', () => {
  const message = normalizeBaileysMessageContent({
    viewOnceMessageV2: {
      message: {
        imageMessage: {
          caption: 'Imagem real',
          mimetype: 'image/jpeg',
        },
      },
    },
  });

  assert.equal(message?.imageMessage?.caption, 'Imagem real');
  assert.equal(message?.imageMessage?.mimetype, 'image/jpeg');
});
