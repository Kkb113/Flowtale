import { expect, test } from '@playwright/test';

const api = 'http://localhost:18080/v1/f';
const actor = 'fable-local-user-a-development-token-v1';

for (const kind of ['video', 'audio'] as const) {
test(`a browser ${kind} recording uploads, transcodes once per format and plays; foreign access is denied`, async ({ page, request }) => {
  test.setTimeout(120000);
  await expect.poll(async () => (await request.get('http://localhost:18080/health')).status(),
    { timeout: 60000, intervals: [1000] }).toBe(200);
  const owner = { Authorization: `Bearer ${actor}` };
  const orgResponse = await request.get(`${api}/orgsfruser`, { headers: owner });
  expect(orgResponse.ok()).toBe(true);
  const orgs = (await orgResponse.json()).data;
  let org = orgs.find((candidate: { displayName: string }) => candidate.displayName === 'Phase 0 media workspace');
  if (!org) {
    const created = await request.post(`${api}/neworg`, { headers: owner,
      data: { displayName: 'Phase 0 media workspace', thumbnail: '' } });
    expect(created.ok()).toBe(true);
    org = (await created.json()).data;
  }
  const headers = { Authorization: `Bearer ${org.id}:${actor}` };
  const tours = await request.get(`${api}/tours`, { headers });
  expect(tours.ok()).toBe(true);
  let tour = (await tours.json()).data.find((candidate: { displayName: string }) => candidate.displayName === 'Media regression');
  if (!tour) {
    const created = await request.post(`${api}/newtour`, { headers, data: { name: 'Media regression' } });
    expect(created.ok()).toBe(true);
    tour = (await created.json()).data;
  }

  // This is an actual browser MediaRecorder WebM, including its final chunk and absent duration header.
  await page.goto('/login');
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const recording = await page.evaluate(async mediaKind => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'blue';
    context.fillRect(0, 0, 160, 120);
    const audioContext = new AudioContext();
    await audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const destination = audioContext.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    const stream = mediaKind === 'video' ? canvas.captureStream(10) : new MediaStream();
    destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    const parts: Blob[] = [];
    const recorder = new MediaRecorder(stream,
      { mimeType: mediaKind === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus' });
    recorder.ondataavailable = event => parts.push(event.data);
    const stopped = new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(parts, { type: recorder.mimeType }));
    });
    const started = new Promise<void>((resolve, reject) => {
      recorder.onstart = () => resolve();
      recorder.onerror = () => reject(new Error('Browser fixture recorder failed to start'));
    });
    let frame = 0;
    const painting = setInterval(() => {
      context.fillStyle = frame++ % 2 ? 'blue' : 'red';
      context.fillRect(0, 0, 160, 120);
    }, 100);
    const recordingStartedAt = performance.now();
    recorder.start(200);
    await started;
    await new Promise(resolve => setTimeout(resolve, 1200));
    recorder.stop();
    const blob = await stopped;
    const wallSeconds = (performance.now() - recordingStartedAt) / 1000;
    clearInterval(painting);
    stream.getTracks().forEach(track => track.stop());
    oscillator.stop();
    await audioContext.close();
    return { bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), type: blob.type, wallSeconds };
  }, kind);
  expect(recording.bytes.length, 'The browser fixture must contain an actual recording').toBeGreaterThan(1000);
  const signed = await request.get(`${api}/getuploadlink?te=${encodeURIComponent(Buffer.from(recording.type).toString('base64'))}`,
    { headers });
  expect(signed.ok()).toBe(true);
  const upload = (await signed.json()).data;
  expect(new URL(upload.url).origin).toBe('http://localhost:14566');
  const uploaded = await request.put(upload.url, { headers: { 'Content-Type': recording.type }, data: Buffer.from(recording.bytes) });
  expect(uploaded.ok()).toBe(true);
  const body = { path: upload.url.split('?')[0], cdnPath: upload.cdnPath,
    assn: { entityRid: tour.rid, entityType: 1 } };
  const route = kind === 'video' ? 'vdt' : 'audt';
  const submitted = await request.post(`${api}/${route}`, { headers, data: body });
  expect(submitted.ok()).toBe(true);
  const jobs = (await submitted.json()).data;
  expect(jobs).toHaveLength(2);
  const duplicate = await request.post(`${api}/${route}`, { headers, data: body });
  expect(duplicate.ok()).toBe(true);
  expect((await duplicate.json()).data.map((job: { jobId: number }) => job.jobId))
    .toEqual(jobs.map((job: { jobId: number }) => job.jobId));
  const complete: { mediaType: string; processedCdnPath: string; jobId: number }[] = [];
  for (const job of jobs) {
    await expect.poll(async () => {
      const result = await request.get(`${api}/mediajobs/${job.jobId}`, { headers });
      expect(result.ok()).toBe(true);
      const current = (await result.json()).data;
      expect(current.processingState, current.failureReason || 'Media job failed').not.toBe(0);
      if (current.processingState === 3) complete.push(current);
      return current.processingState;
    }, { timeout: 60000, intervals: [500, 1000, 2000] }).toBe(3);
  }
  const progressive = complete.find(job => job.mediaType === (kind === 'video' ? 'VIDEO_MP4' : 'AUDIO_WEBM'))!;
  const hls = complete.find(job => job.mediaType === (kind === 'video' ? 'VIDEO_HLS' : 'AUDIO_HLS'))!;
  const playlist = await request.get(hls.processedCdnPath);
  expect(playlist.ok()).toBe(true);
  const text = await playlist.text();
  expect(text).toContain('#EXT-X-ENDLIST');
  for (const segment of text.split(/\r?\n/).filter(line => line && !line.startsWith('#'))) {
    expect((await request.get(new URL(segment, hls.processedCdnPath).href)).ok()).toBe(true);
  }
  const duration = await page.evaluate(async ({ url, mediaKind }) => {
    const video = document.createElement(mediaKind);
    video.muted = true;
    video.src = url;
    document.body.appendChild(video);
    await video.play();
    await new Promise<void>((resolve, reject) => {
      video.onended = () => resolve();
      video.onerror = () => reject(new Error('Browser playback failed'));
    });
    const seconds = video.duration;
    video.remove();
    return seconds;
  }, { url: progressive.processedCdnPath, mediaKind: kind });
  expect(duration).toBeGreaterThan(0.8);
  expect(duration).toBeLessThan(recording.wallSeconds + 0.3);
  const stranger = { Authorization: 'Bearer fable-local-user-b-development-token-v1' };
  expect((await request.get(`${api}/mediajobs/${progressive.jobId}`, { headers: stranger })).ok()).toBe(false);
  const crossTenant = await request.post(`${api}/${route}`, { headers,
    data: { ...body, path: body.path.replace(`/org/${org.id}/`, '/org/999999/') } });
  expect(crossTenant.status()).toBe(404);
});
}
