import { comparePassword, hash, decrypt, encrypt, hashPassword, jwtSign, jwtVerify, uniqid } from '../src/security';

describe('uniqid', () => {
  test('unique id', async () => {
    const ids: any[] = [];
    for (let i = 0; i < 10; i++) ids.push(uniqid());

    expect(new Set(ids).size).toEqual(10);
    expect(ids.every((id) => id.toString(2).length <= 63)).toEqual(true);
  });

  test('benchmark', async () => {
    const lastTime = Date.now();

    for (let i = 0; i < 1000000; i++) uniqid();

    console.log(`Benchmark for 1M ids: ${Date.now() - lastTime}ms`);
  });
});

describe('password', () => {
  it('should hash password', async () => {
    const passhash = await hashPassword('password');

    expect(await comparePassword(passhash, 'password')).toBe(true);
    expect(await comparePassword(passhash, 'password1')).toBe(false);
  });

  it('should compare plain password', async () => {
    expect(await comparePassword('plain:abcdef', 'abcdef')).toBe(true);
    expect(await comparePassword('plain:abcdef', 'abcdeg')).toBe(false);
  });
});

describe('jwt', () => {
  it('should sign jwt', async () => {
    expect(jwtVerify(jwtSign({ foo: 'bar' }, 'secret'), 'secret')).toHaveProperty('foo', 'bar');
    expect(jwtVerify(jwtSign({ foo: 'bar' }, 'secret'), 'secret')).toHaveProperty('iat');

    expect(jwtVerify(jwtSign({ foo: 'bar' }, 'secrt'), 'secret')).toEqual(false);
    expect(jwtVerify(jwtSign({ foo: 'bar', exp: Math.floor(+new Date() / 1000) - 1 }, 'secret'), 'secret')).toEqual(
      false,
    );
  });
});

describe('encrypt/decrypt', () => {
  it('should encrypt & decrypt', async () => {
    const password = 'password';
    const plainText = 'Lorem ipsum';
    const cipherText = await encrypt(plainText, password);
    expect(await hash(password)).toEqual('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');
    expect(await decrypt(cipherText, password)).toEqual(plainText);
  });
});
