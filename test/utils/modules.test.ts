import { moduleExists } from '../../src/utils/modules';

test('will return if the module exists', async () => {
  await expect(moduleExists('no-it-does-not')).resolves.toBe(false);
  await expect(moduleExists('no-it-does-not')).resolves.toBe(false);

  await expect(moduleExists('aws-sdk')).resolves.toBe(true);
  await expect(moduleExists('aws-sdk')).resolves.toBe(true);
});
