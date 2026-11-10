const qrcode = () => {
    $('[data-qr]').each(function () {
      if (this.qrcode === true) {
        return true;
      }
      const $this = $(this);
      const qr = $this.data('qr');
      const width = $this.data('width') || undefined;
      const height = $this.data('height') || undefined;
      const background = $this.data('background') || '#ffffff';
      const foreground = $this.data('foreground') || '#000000';

      $this.qrcode({
        text: qr,
        width,
        height,
        background,
        foreground,
      });
      // 防止重复渲染
      this.qrcode = true;
    });
  };

  export default qrcode;
