// 이미지 첨부 유틸. 한도는 백엔드와 일치(1장 10MB, 리포트당 20장).

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_REPORT = 20;

export const PHOTO_KINDS = ['현장 전경', '문제 부위', '근접', '기타'];

/** 파일 1장이 용량 한도 이내인가 */
export function isWithinSize(file) {
  return !!file && file.size <= MAX_IMAGE_BYTES;
}

/** 현재 장수에 adding장을 더 추가할 수 있는가 (리포트당 20장) */
export function canAddMore(currentCount, adding = 1) {
  return currentCount + adding <= MAX_IMAGES_PER_REPORT;
}

/** File → data URL(Base64). 브라우저 FileReader 사용. */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

/** 백엔드 inspection.images → 업로더 모델로 변환 */
export function fromInspectionImages(images = []) {
  return (images ?? []).map((i) => ({
    dataBase64: i.data_base64,
    kind: i.kind ?? '',
    caption: i.caption ?? '',
  }));
}
