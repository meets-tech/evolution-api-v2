import assert from 'node:assert/strict';
import test from 'node:test';

import {
  incomingCallMessageId,
  IncomingCallActionCache,
  processIncomingCallAutomation,
} from '../src/utils/incomingCallAutomation';

test('gera o mesmo id de mensagem para todas as tentativas da mesma chamada', () => {
  assert.equal(incomingCallMessageId('call-1'), incomingCallMessageId('call-1'));
  assert.notEqual(incomingCallMessageId('call-1'), incomingCallMessageId('call-2'));
  assert.match(incomingCallMessageId('call-1'), /^[A-F0-9]{32}$/);
});

function memoryCache(): IncomingCallActionCache {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: <T>(key: string, value: T) => values.set(key, value),
  };
}

test('rejeita a chamada e envia a mensagem configurada', async () => {
  const cache = memoryCache();
  let rejected = 0;
  let messages = 0;

  await processIncomingCallAutomation(
    {
      callId: 'call-1',
      status: 'offer',
      rejectEnabled: true,
      messageEnabled: true,
      reject: async () => rejected++,
      sendMessage: async () => messages++,
    },
    cache,
  );

  assert.equal(rejected, 1);
  assert.equal(messages, 1);
});

test('não repete ações concluídas para o mesmo call id', async () => {
  const cache = memoryCache();
  let rejected = 0;
  let messages = 0;
  const input = {
    callId: 'call-2',
    status: 'offer',
    rejectEnabled: true,
    messageEnabled: true,
    reject: async () => rejected++,
    sendMessage: async () => messages++,
  };

  await processIncomingCallAutomation(input, cache);
  await processIncomingCallAutomation(input, cache);

  assert.equal(rejected, 1);
  assert.equal(messages, 1);
});

test('repete somente a ação que falhou', async () => {
  const cache = memoryCache();
  let rejected = 0;
  let messages = 0;
  const input = {
    callId: 'call-3',
    status: 'offer',
    rejectEnabled: true,
    messageEnabled: true,
    reject: async () => {
      rejected++;
      if (rejected === 1) throw new Error('temporary failure');
    },
    sendMessage: async () => messages++,
    retryDelaysMs: [],
  };

  await assert.rejects(processIncomingCallAutomation(input, cache));
  await processIncomingCallAutomation(input, cache);

  assert.equal(rejected, 2);
  assert.equal(messages, 1);
});

test('repete a mensagem dentro do mesmo evento quando a primeira tentativa falha', async () => {
  const cache = memoryCache();
  let rejected = 0;
  let messages = 0;

  await processIncomingCallAutomation(
    {
      callId: 'call-transient-message',
      status: 'offer',
      rejectEnabled: true,
      messageEnabled: true,
      reject: async () => rejected++,
      sendMessage: async () => {
        messages++;
        if (messages === 1) throw new Error('temporary send failure');
      },
      retryDelaysMs: [0],
    },
    cache,
  );

  assert.equal(rejected, 1);
  assert.equal(messages, 2);
});

test('ignora estados que não sejam uma oferta de chamada', async () => {
  const cache = memoryCache();
  let actions = 0;

  await processIncomingCallAutomation(
    {
      callId: 'call-4',
      status: 'terminate',
      rejectEnabled: true,
      messageEnabled: true,
      reject: async () => actions++,
      sendMessage: async () => actions++,
    },
    cache,
  );

  assert.equal(actions, 0);
});

test('mantém ações independentes para chamadas diferentes do mesmo lote', async () => {
  const cache = memoryCache();
  const handled: string[] = [];

  for (const callId of ['call-5', 'call-6']) {
    await processIncomingCallAutomation(
      {
        callId,
        status: 'offer',
        rejectEnabled: true,
        messageEnabled: true,
        reject: async () => {
          handled.push(`${callId}:reject`);
        },
        sendMessage: async () => {
          handled.push(`${callId}:message`);
        },
      },
      cache,
    );
  }

  assert.deepEqual(handled, [
    'call-5:reject',
    'call-5:message',
    'call-6:reject',
    'call-6:message',
  ]);
});
