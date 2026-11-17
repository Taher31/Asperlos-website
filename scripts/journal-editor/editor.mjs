import { Editor } from '@tiptap/core';
import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import { StarterKit } from '@tiptap/starter-kit';

const mediaPath = /^\/journal-media\/[a-z0-9][a-z0-9-]*\.(?:jpe?g|png|webp)$/;
const editorStyles = [
  ['heading', 'تیتر', 'h2', (chain) => chain.toggleHeading({ level: 2 })],
  ['subheading', 'زیرتیتر', 'h3', (chain) => chain.toggleHeading({ level: 3 })],
  ['bold', 'پررنگ', 'strong', (chain) => chain.toggleBold()],
  ['italic', 'مورب', 'em', (chain) => chain.toggleItalic()],
  ['bulletList', 'فهرست', 'ul', (chain) => chain.toggleBulletList()],
  ['orderedList', 'شماره‌دار', 'ol', (chain) => chain.toggleOrderedList()],
  ['blockquote', 'نقل‌قول', 'blockquote', (chain) => chain.toggleBlockquote()],
];

const buttons = editorStyles.map(([name, label]) =>
  '<button type="button" data-editor-action="' + name + '" aria-pressed="false">' + label + '</button>'
).join('');
const markup = `
  <div class="journal-editor-bar">
    <div class="journal-editor-format" aria-label="قالب‌بندی متن" role="group">
      ${buttons}
      <button type="button" data-editor-action="link">پیوند</button>
      <button type="button" data-editor-action="image" class="journal-editor-image-action">عکس در متن</button>
      <button type="button" data-editor-action="undo" title="واگرد (Ctrl+Z)">واگرد</button>
      <button type="button" data-editor-action="redo" title="ازنو (Ctrl+Shift+Z)">ازنو</button>
    </div>
    <button type="button" class="journal-editor-mode" aria-pressed="false">Markdown</button>
  </div>
  <div class="journal-editor-canvas"></div>
  <div class="journal-editor-source" hidden></div>
  <div class="journal-editor-foot"><span class="journal-editor-tip">عکس را در محل نشانگر درج کن. برای ویرایش زیرنویس یا توضیح، روی عکس بزن.</span><output class="journal-editor-count"></output></div>
  <dialog class="journal-editor-dialog" aria-labelledby="image-details-heading">
    <h3 id="image-details-heading">عکس در متن</h3>
    <label class="journal-editor-upload">انتخاب عکس<input type="file" accept=".jpg,.jpeg,.png,.webp"></label>
    <label>نام یا زیرنویس عکس<input type="text" data-image-caption dir="auto" maxlength="300"></label>
    <label>توضیح جایگزین عکس<input type="text" data-image-alt dir="auto" maxlength="300"></label>
    <p class="hint">زیرنویس زیر تصویر دیده می‌شود. توضیح جایگزین برای وقتی است که عکس دیده نمی‌شود.</p>
    <p class="journal-editor-dialog-status" role="status"></p>
    <div class="journal-editor-dialog-actions">
      <button type="button" data-image-remove>حذف از متن</button>
      <button type="button" data-image-close>انصراف</button>
      <button type="button" data-image-save>درج عکس</button>
    </div>
  </dialog>
  <dialog class="journal-editor-dialog" aria-labelledby="link-details-heading">
    <h3 id="link-details-heading">پیوند</h3>
    <label>عنوان پیوند<input type="text" data-link-text dir="auto"></label>
    <label>نشانی<input type="url" data-link-url dir="ltr" placeholder="https://…"></label>
    <p class="journal-editor-dialog-status" role="status"></p>
    <div class="journal-editor-dialog-actions">
      <button type="button" data-link-remove>حذف پیوند</button>
      <button type="button" data-link-close>انصراف</button>
      <button type="button" data-link-save>ذخیره پیوند</button>
    </div>
  </dialog>
`;

function safeLink(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

const escapeAlt = (value) => (value ?? '').replace(/[\\\[\]]/g, '\\$&');
const escapeCaption = (value) => (value ?? '').replace(/[\\"]/g, '\\$&');

const JournalImage = Image.extend({
  addOptions() {
    return { ...this.parent?.(), openDetails: null };
  },
  renderMarkdown({ attrs }) {
    if (!attrs?.src) return '';
    const source = attrs.src.replaceAll(' ', '%20').replaceAll('(', '%28').replaceAll(')', '%29');
    const title = attrs.title ? ' "' + escapeCaption(attrs.title) + '"' : '';
    return '![' + escapeAlt(attrs.alt) + '](' + source + title + ')';
  },
  addNodeView() {
    const openDetails = this.options.openDetails;
    return ({ node, getPos }) => {
      const dom = document.createElement('figure');
      dom.className = 'journal-inline-image';
      dom.contentEditable = 'false';
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'ویرایش عکس و زیرنویس');
      const image = document.createElement('img');
      const caption = document.createElement('figcaption');
      button.append(image);
      dom.append(button, caption);

      let current = node;
      const render = () => {
        const { src, title, alt } = current.attrs;
        const allowed = mediaPath.test(src) ? src : safeLink(src);
        if (allowed) image.setAttribute('src', allowed);
        else image.removeAttribute('src');
        image.alt = alt ?? '';
        caption.textContent = title ?? '';
        caption.hidden = !title;
      };
      render();
      button.addEventListener('click', () => openDetails(getPos(), current.attrs));
      return {
        dom,
        stopEvent: (event) => event.type !== 'dragstart' && button.contains(event.target),
        update(next) {
          if (next.type !== node.type) return false;
          current = next;
          render();
          return true;
        },
      };
    };
  },
});

export function mountJournalEditor(textarea, { uploadImage }) {
  const label = textarea.labels?.[0];
  if (label && !label.id) label.id = textarea.id + '-label';
  const shell = document.createElement('div');
  shell.className = 'journal-body-editor';
  shell.innerHTML = markup;
  textarea.before(shell);
  const find = (selector) => shell.querySelector(selector);
  const source = find('.journal-editor-source');
  const canvas = find('.journal-editor-canvas');
  const toolbar = find('.journal-editor-format');
  const modeButton = find('.journal-editor-mode');
  const count = find('.journal-editor-count');
  const imageDialog = find('dialog[aria-labelledby="image-details-heading"]');
  const linkDialog = find('dialog[aria-labelledby="link-details-heading"]');
  const imageFile = imageDialog.querySelector('input[type="file"]');
  const imageCaption = find('[data-image-caption]');
  const imageAlt = find('[data-image-alt]');
  const imageSave = find('[data-image-save]');
  const linkText = find('[data-link-text]');
  const linkUrl = find('[data-link-url]');
  source.append(textarea);
  textarea.removeAttribute('aria-describedby');

  let editor;
  let language = 'fa';
  let sourceMode = false;
  let disabled = textarea.matches(':disabled');
  let imagePosition;
  let uploading = false;
  let linkSelection;

  function updateCount() {
    const content = sourceMode ? textarea.value : editor.getText();
    const words = Array.from(new Intl.Segmenter(language, { granularity: 'word' }).segment(content))
      .filter((segment) => segment.isWordLike).length;
    count.textContent = new Intl.NumberFormat('fa').format(words) + ' واژه';
  }

  function updateToolbar() {
    for (const [name, , htmlTag] of editorStyles) {
      const active = htmlTag === 'h2' || htmlTag === 'h3'
        ? editor.isActive('heading', { level: Number(htmlTag[1]) })
        : editor.isActive(name);
      find('[data-editor-action="' + name + '"]').setAttribute('aria-pressed', String(active));
    }
    find('[data-editor-action="undo"]').disabled = disabled || !editor.can().undo();
    find('[data-editor-action="redo"]').disabled = disabled || !editor.can().redo();
  }

  function recreate() {
    editor?.destroy();
    const direction = language === 'fa' ? 'rtl' : 'ltr';
    editor = new Editor({
      element: canvas,
      editable: !disabled && !sourceMode,
      extensions: [
        StarterKit.configure({ link: { openOnClick: false, linkOnPaste: true } }),
        Markdown.configure({ markedOptions: { gfm: true } }),
        TableKit,
        JournalImage.configure({ openDetails: openImageDialog }),
      ],
      editorProps: {
        attributes: {
          dir: direction,
          lang: language,
          role: 'textbox',
          'aria-multiline': 'true',
          ...(label ? { 'aria-labelledby': label.id } : { 'aria-label': 'متن مطلب' }),
        },
        handleKeyDown(_, event) {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            openLinkDialog();
            return true;
          }
          return false;
        },
      },
      content: textarea.value,
      contentType: 'markdown',
      onUpdate({ editor: activeEditor }) {
        textarea.value = activeEditor.getMarkdown();
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      },
      onTransaction: () => queueMicrotask(updateToolbar),
    });
    textarea.dir = direction;
    textarea.lang = language;
    updateToolbar();
    updateCount();
  }

  function setDisabled(value) {
    disabled = value;
    shell.setAttribute('aria-disabled', String(value));
    const editable = !value && !sourceMode;
    if (editor && editor.isEditable !== editable) editor.setEditable(editable, false);
    if (editor) updateToolbar();
  }

  function refresh(nextLanguage) {
    language = nextLanguage;
    recreate();
  }

  function showDialogStatus(dialog, message) {
    dialog.querySelector('[role="status"]').textContent = message;
  }

  function openImageDialog(position, attrs) {
    if (disabled) return;
    imagePosition = Number.isInteger(position) ? position : null;
    imageFile.value = '';
    imageFile.closest('label').hidden = imagePosition !== null;
    imageCaption.value = attrs?.title ?? '';
    imageAlt.value = attrs?.alt ?? '';
    find('[data-image-remove]').hidden = imagePosition === null;
    imageSave.textContent = imagePosition === null ? 'درج عکس' : 'ذخیره تغییرات';
    showDialogStatus(imageDialog, '');
    imageDialog.showModal();
    (imagePosition === null ? imageFile : imageCaption).focus();
  }

  async function saveImage() {
    if (uploading || disabled) return;
    const title = imageCaption.value.trim();
    const alt = imageAlt.value.trim();
    if (imagePosition !== null) {
      const attrs = editor.state.doc.nodeAt(imagePosition)?.attrs;
      if (attrs) editor.chain().setNodeSelection(imagePosition).updateAttributes('image', { title, alt }).run();
      imageDialog.close();
      editor.commands.focus();
      return;
    }
    const [file] = imageFile.files;
    if (!file) {
      showDialogStatus(imageDialog, 'یک عکس انتخاب کن.');
      imageFile.focus();
      return;
    }
    const currentEditor = editor;
    const position = editor.state.selection.to;
    uploading = true;
    for (const control of imageDialog.querySelectorAll('input, button')) control.disabled = true;
    showDialogStatus(imageDialog, 'در حال افزودن عکس…');
    try {
      const src = await uploadImage(file);
      if (!mediaPath.test(src)) throw new Error('نشانی عکس معتبر نیست.');
      if (editor !== currentEditor || disabled) throw new Error('مطلب عوض شد. دوباره عکس را انتخاب کن.');
      editor.chain().setTextSelection(position).insertContent([
        { type: 'image', attrs: { src, title, alt } },
        { type: 'paragraph' },
      ]).run();
      imageDialog.close();
      // Closing the dialog restores the old DOM caret. Sync it with the editor selection.
      editor.view.focus();
    } catch (error) {
      showDialogStatus(imageDialog, error.message || 'افزودن عکس ممکن نشد.');
    } finally {
      uploading = false;
      for (const control of imageDialog.querySelectorAll('input, button')) control.disabled = false;
    }
  }

  function openLinkDialog() {
    if (disabled) return;
    if (editor.isActive('link')) editor.commands.extendMarkRange('link');
    const { from, to } = editor.state.selection;
    linkSelection = { from, to };
    linkText.value = editor.state.doc.textBetween(from, to, ' ');
    linkUrl.value = editor.getAttributes('link').href ?? '';
    find('[data-link-remove]').hidden = !linkUrl.value;
    showDialogStatus(linkDialog, '');
    linkDialog.showModal();
    (linkText.value ? linkUrl : linkText).focus();
  }

  function saveLink() {
    const href = safeLink(linkUrl.value.trim());
    const title = linkText.value.trim();
    if (!href || !title) {
      showDialogStatus(linkDialog, 'عنوان و نشانی معتبر http یا https را وارد کن.');
      return;
    }
    const previous = editor.state.doc.textBetween(linkSelection.from, linkSelection.to, ' ');
    if (title === previous) editor.chain().setTextSelection(linkSelection).setLink({ href }).run();
    else editor.chain().insertContentAt(linkSelection, [{ type: 'text', text: title, marks: [{ type: 'link', attrs: { href } }] }]).run();
    linkDialog.close();
    editor.commands.focus();
  }

  function toggleMode() {
    sourceMode = !sourceMode;
    modeButton.setAttribute('aria-pressed', String(sourceMode));
    modeButton.textContent = sourceMode ? 'ویرایش دیداری' : 'Markdown';
    source.hidden = !sourceMode;
    canvas.hidden = sourceMode;
    toolbar.hidden = sourceMode;
    if (sourceMode) {
      editor.setEditable(false, false);
      textarea.focus();
    }
    else {
      recreate();
      editor.commands.focus();
    }
    updateCount();
  }

  const actions = Object.fromEntries(editorStyles.map(([name, , , action]) => [
    name, () => action(editor.chain().focus()).run(),
  ]));
  Object.assign(actions, {
    image: openImageDialog,
    link: openLinkDialog,
    undo: () => editor.chain().focus().undo().run(),
    redo: () => editor.chain().focus().redo().run(),
  });
  toolbar.addEventListener('mousedown', (event) => {
    if (event.target.closest('button')) event.preventDefault();
  });
  toolbar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-editor-action]');
    if (!disabled && button) actions[button.dataset.editorAction]();
  });
  modeButton.addEventListener('click', toggleMode);
  label?.addEventListener('click', (event) => {
    if (sourceMode || disabled) return;
    event.preventDefault();
    editor.commands.focus();
  });
  textarea.addEventListener('input', updateCount);
  imageSave.addEventListener('click', saveImage);
  find('[data-image-close]').addEventListener('click', () => imageDialog.close());
  find('[data-image-remove]').addEventListener('click', () => {
    editor.chain().setNodeSelection(imagePosition).deleteSelection().run();
    imageDialog.close();
    editor.commands.focus();
  });
  imageDialog.addEventListener('cancel', (event) => {
    if (uploading) event.preventDefault();
  });
  find('[data-link-close]').addEventListener('click', () => linkDialog.close());
  find('[data-link-save]').addEventListener('click', saveLink);
  find('[data-link-remove]').addEventListener('click', () => {
    editor.chain().setTextSelection(linkSelection).unsetLink().run();
    linkDialog.close();
    editor.commands.focus();
  });
  for (const [dialog, save] of [[imageDialog, saveImage], [linkDialog, saveLink]]) {
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.matches('input:not([type="file"])')) {
        event.preventDefault();
        void save();
      }
    });
  }
  recreate();
  setDisabled(disabled);
  return { refresh, setDisabled };
}
