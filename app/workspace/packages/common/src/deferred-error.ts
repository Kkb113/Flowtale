export default function raiseDeferredError(err: Error): void {
  const globalData = (typeof window !== 'undefined' && (window as any).__fable_global_app_data__) || {};
  const anonymousDemoId = globalData.anonymousDemoId;

  let updatedMessage = err.message;
  if (anonymousDemoId) {
    updatedMessage = `${err.message} for anonymousDemoId: ${anonymousDemoId}`;
  }
  const updatedError = new Error(updatedMessage);

  console.warn(`${updatedMessage}. An error will be thrown in next couple of frames`);
  const timer = setTimeout(() => {
    clearTimeout(timer);
    throw updatedError;
  }, 32);
}
