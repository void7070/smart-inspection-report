import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PhotoUploader from '../src/components/PhotoUploader.vue';

describe('PhotoUploader', () => {
  it('initialImages를 미리보기로 렌더', () => {
    const w = mount(PhotoUploader, {
      props: { initialImages: [{ data_base64: 'data:image/png;base64,AAAA', kind: '근접', caption: '천장' }] },
    });
    expect(w.findAll('img')).toHaveLength(1);
    expect(w.text()).toContain('1/20');
  });

  it('비었으면 안내 문구', () => {
    const w = mount(PhotoUploader, { props: { initialImages: [] } });
    expect(w.text()).toContain('첨부된 사진이 없습니다.');
  });

  it('사진 저장 클릭 시 현재 이미지로 save emit', async () => {
    const w = mount(PhotoUploader, {
      props: { initialImages: [{ data_base64: 'AAAA', kind: '', caption: '' }] },
    });
    await w.findAll('button').find((b) => b.text() === '사진 저장').trigger('click');
    expect(w.emitted('save')[0][0]).toHaveLength(1);
  });

  // '사진 저장'을 깜빡하고 제출해도 사진이 유실되지 않도록 변경 즉시 자동 저장한다.
  it('사진 유형 변경 시 자동 save emit', async () => {
    const w = mount(PhotoUploader, {
      props: { initialImages: [{ data_base64: 'AAAA', kind: '', caption: '' }] },
    });
    await w.find('select').setValue('근접');
    expect(w.emitted('save')).toBeTruthy();
  });

  it('사진 삭제 시 자동 save emit (남은 이미지로)', async () => {
    const w = mount(PhotoUploader, {
      props: {
        initialImages: [
          { data_base64: 'AAAA', kind: '', caption: '' },
          { data_base64: 'BBBB', kind: '', caption: '' },
        ],
      },
    });
    await w.findAll('button').find((b) => b.text() === '×').trigger('click');
    const last = w.emitted('save').at(-1)[0];
    expect(last).toHaveLength(1);
  });
});
