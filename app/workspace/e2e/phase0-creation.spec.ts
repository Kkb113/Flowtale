import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getImgScreenData } from '../packages/common/dist/utils';

test('real MySQL creation receipts serialize retries and replay the original save acknowledgement', async ({ request }) => {
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const orgs = await request.get(`${base}/orgsfruser`, { headers: { Authorization: `Bearer ${token}` } });
  expect(orgs.ok()).toBe(true);
  const org = (await orgs.json()).data[0];
  expect(org).toBeTruthy();
  const headers = { Authorization: `Bearer ${org.id}:${token}`, 'Idempotency-Key': randomUUID() };
  const data = { name: `Concurrent creation ${randomUUID()}` };
  const created = await Promise.all([1, 2].map(() => request.post(`${base}/newtour`, { headers, data })));
  for (const response of created) expect(response.ok(), await response.text()).toBe(true);
  const [first, retry] = await Promise.all(created.map(response => response.json()));
  expect(retry).toEqual(first);
  const tours = await request.get(`${base}/tours`, { headers });
  expect((await tours.json()).data.filter((tour: any) => tour.displayName === data.name)).toHaveLength(1);
  const changed = await request.post(`${base}/newtour`, { headers, data: { name: `${data.name} changed` } });
  expect(changed.status()).toBe(409);
  const malformed = await request.post(`${base}/newtour`, {
    headers: { ...headers, 'Idempotency-Key': 'invalid key' }, data,
  });
  expect(malformed.status()).toBe(400);
  const editHeaders = { ...headers, 'Idempotency-Key': randomUUID() };
  const edit = { rid: first.data.rid, expectedRevision: new Date(first.data.updatedAt).getTime(), editData: '{}' };
  const saved = await Promise.all([1, 2].map(() => request.post(`${base}/recordtredit`, { headers: editHeaders, data: edit })));
  for (const response of saved) expect(response.ok(), await response.text()).toBe(true);
  const [savedFirst, savedRetry] = await Promise.all(saved.map(response => response.json()));
  expect(savedRetry).toEqual(savedFirst);
  expect(new Date(savedFirst.data.updatedAt).getTime()).toBeGreaterThan(edit.expectedRevision);
  const read = await request.get(`${base}/tour?rid=${first.data.rid}`, { headers });
  expect((await read.json()).data.updatedAt).toBe(savedFirst.data.updatedAt);
});

test('an image creation retry returns a usable upload URL and reuses its thumbnail', async ({ request }) => {
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const orgs = await request.get(`${base}/orgsfruser`, { headers: { Authorization: `Bearer ${token}` } });
  expect(orgs.ok()).toBe(true);
  const org = (await orgs.json()).data[0];
  const headers = { Authorization: `Bearer ${org.id}:${token}`, 'Idempotency-Key': randomUUID() };
  const data = { name: 'Retry image fixture', type: 0, contentType: 'image/png', body: JSON.stringify(getImgScreenData()) };
  const created = await request.post(`${base}/newscreen`, { headers, data });
  expect(created.ok(), await created.text()).toBe(true);
  const first = (await created.json()).data;
  const retried = await request.post(`${base}/newscreen`, { headers, data });
  expect(retried.ok(), await retried.text()).toBe(true);
  const screen = (await retried.json()).data;
  expect(screen.rid).toBe(first.rid);
  expect(screen.uploadUrl).toBeTruthy();
  const thumbHeaders = { ...headers, 'Idempotency-Key': randomUUID() };
  const corrupt = await request.put(screen.uploadUrl, { headers: { 'Content-Type': 'image/png' }, data: 'not an image' });
  expect(corrupt.ok()).toBe(true);
  const rejected = await request.post(`${base}/genthumb`, { headers: thumbHeaders, data: { screenRid: screen.rid } });
  expect(rejected.status()).toBe(422);
  const unchanged = await request.get(`${base}/screen?rid=${screen.rid}`, { headers });
  expect((await unchanged.json()).data.thumbnail).toBe(first.thumbnail);
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1sAAAAASUVORK5CYII=', 'base64');
  const uploaded = await request.put(screen.uploadUrl, { headers: { 'Content-Type': 'image/png' }, data: image });
  expect(uploaded.ok(), await uploaded.text()).toBe(true);
  const originalUrl = new URL(screen.uploadUrl);
  originalUrl.search = '';
  expect((await request.get(originalUrl.href)).ok()).toBe(false);
  const draftImage = await request.get(`${base}/draft/screen/${screen.rid}/index.img`, { headers });
  expect(draftImage.ok(), await draftImage.text()).toBe(true);
  expect(await draftImage.body()).toEqual(image);
  expect((await request.get(`${base}/draft/screen/${screen.rid}/index.img`)).ok()).toBe(false);
  const thumbnails = await Promise.all([1, 2].map(() => request.post(`${base}/genthumb`, {
    headers: thumbHeaders, data: { screenRid: screen.rid },
  })));
  for (const thumbnail of thumbnails) expect(thumbnail.ok(), await thumbnail.text()).toBe(true);
  const [a, b] = await Promise.all(thumbnails.map(response => response.json()));
  expect(a.data.thumbnail).toBeTruthy();
  expect(a.data.thumbnailData).toMatch(/^data:image\/jpeg;base64,/);
  const config = (await (await request.get('http://localhost:18080/v1/cconfig')).json()).data;
  expect((await request.get(`${config.commonAssetPath}${a.data.thumbnail}`)).ok()).toBe(false);
  expect(b).toEqual(a);
  const createdTour = await request.post(`${base}/newtour`, { headers: { Authorization: headers.Authorization }, data: { name: `Image publication ${Date.now()}` } });
  expect(createdTour.ok(), await createdTour.text()).toBe(true);
  const tour = (await createdTour.json()).data;
  const copy = await request.post(`${base}/copyscreen`, { headers: { Authorization: headers.Authorization }, data: { parentId: screen.id, tourRid: tour.rid } });
  expect(copy.ok(), await copy.text()).toBe(true);
  const cloned = (await copy.json()).data;
  const sourceDocument = await request.get(`${base}/draft/screen/${cloned.rid}/index.json`, { headers });
  expect(sourceDocument.ok()).toBe(true);
  expect((await sourceDocument.json()).docTree.chldrn[2].chldrn[1].attrs.src).toContain(cloned.assetPrefixHash);
  const subscription = await request.get(`${base}/subs`, { headers });
  expect(subscription.ok()).toBe(true);
  if (!(await subscription.json()).data) {
    const setup = await request.post(`${base}/checkout`, { headers: { Authorization: headers.Authorization },
      data: { pricingPlan: 'BUSINESS', pricingInterval: 'MONTHLY' } });
    expect(setup.ok(), await setup.text()).toBe(true);
  }
  const publication = await request.post(`${base}/tpub`, { headers: { Authorization: headers.Authorization }, data: { tourRid: tour.rid } });
  expect(publication.ok(), await publication.text()).toBe(true);
  const publicSource = await request.get(`${config.pubTourAssetPath}assets-${tour.assetPrefixHash}/1/screens/${cloned.assetPrefixHash}/index.json`);
  expect(publicSource.ok(), await publicSource.text()).toBe(true);
  const publishedImage = (await publicSource.json()).docTree.chldrn[2].chldrn[1].attrs.src;
  expect(publishedImage).toContain(`/assets-${tour.assetPrefixHash}/1/`);
  expect(await (await request.get(publishedImage)).body()).toEqual(image);
});
