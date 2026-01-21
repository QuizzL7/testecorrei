/*
  Integração PIX (copiada/espelhada do projeto 31312-main):
  - Cria transação PIX via PayEvo (apiv2.payevo.com.br)
  - Gera QRCode automaticamente (biblioteca qrcodejs)
  - Verifica status da transação periodicamente

  Nota: o código de referência chama a API direto do navegador
  (com CORS via corsproxy.io) e mantém a chave no front-end.
*/

(function () {
  'use strict';

  const PAYEVO_SECRET_KEY = 'SUA_SECRET_KEY_AQUI';
  const PAYMENT_AMOUNT = 4512; // centavos
  const CREATE_URL = 'https://corsproxy.io/?url=https://apiv2.payevo.com.br/functions/v1/transactions';

  let transactionId = null;
  let paymentCheckInterval = null;

  function centsToBRL(cents) {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function getDados() {
    try {
      const raw = localStorage.getItem('dados');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function ensureDadosFallback(d) {
    const safe = d && typeof d === 'object' ? d : {};
    return {
      nome: String(safe.nome || 'Cliente').trim(),
      cpf: String(safe.cpf || '12345678909').replace(/\D/g, '').slice(0, 11)
    };
  }

  function getAuthHeader() {
    return 'Basic ' + btoa(PAYEVO_SECRET_KEY + ':x');
  }

  function stopCheck() {
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval);
      paymentCheckInterval = null;
    }
  }

  async function createPaymentTransaction(ui) {
    const { qrcodeContainer, paymentStatus, paymentChecking } = ui;

    try {
      if (!window.QRCode) {
        throw new Error('QRCodeJS não carregou.');
      }

      qrcodeContainer.innerHTML = 'Gerando QR Code PIX...';
      paymentStatus.style.display = 'none';
      paymentChecking.classList.remove('active');

      const dados = ensureDadosFallback(getDados());

      const req = {
        amount: PAYMENT_AMOUNT,
        description: 'Pedido',
        paymentMethod: 'PIX',
        customer: {
          name: dados.nome,
          document: {
            number: dados.cpf,
            type: 'CPF'
          }
        }
      };

      const response = await fetch(CREATE_URL, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('API error:', data);
        throw new Error(data.error || data.message || 'Falha ao criar transação');
      }

      transactionId = data.id;

      if (data?.pix?.qrcode) {
        const pixCode = data.pix.qrcode;
        qrcodeContainer.innerHTML = '';

        new QRCode(qrcodeContainer, {
          text: pixCode,
          width: 260,
          height: 260
        });

        setTimeout(() => {
          qrcodeContainer.insertAdjacentHTML('beforeend', `
            <button id="copy-pix" style="margin-top:12px;padding:10px;background:#014169;color:#fff;border:none;border-radius:6px;cursor:pointer;width:260px;">
              Copiar código PIX
            </button>
          `);

          document.getElementById('copy-pix').onclick = () => {
            navigator.clipboard.writeText(pixCode)
              .then(() => alert('Código PIX copiado!'))
              .catch(err => alert('Erro ao copiar: ' + err));
          };
        }, 200);
      }

      startPaymentCheck(ui);

    } catch (err) {
      console.error(err);
      qrcodeContainer.innerHTML = 'Erro ao gerar QR Code.';
      paymentStatus.textContent = err.message || 'Falha no pagamento.';
      paymentStatus.style.display = 'block';
    }
  }

  function startPaymentCheck(ui) {
    const { paymentBtn, paymentStatus, paymentChecking } = ui;

    if (!transactionId) return;

    stopCheck();
    paymentChecking.classList.add('active');

    paymentCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `https://corsproxy.io/?url=https://apiv2.payevo.com.br/functions/v1/transactions/${transactionId}`,
          { headers: { 'Authorization': getAuthHeader() } }
        );

        const data = await response.json().catch(() => ({}));
        const status = (data.status || '').toLowerCase();

        if (['paid', 'approved', 'completed'].includes(status)) {
          stopCheck();
          paymentChecking.classList.remove('active');

          paymentStatus.textContent = 'Pagamento confirmado!';
          paymentStatus.style.display = 'block';

          if (paymentBtn) {
            paymentBtn.style.cursor = 'not-allowed';
            paymentBtn.style.opacity = '0.5';
          }

          localStorage.setItem('payment_completed', 'true');
        }
      } catch (err) {
        console.error('Check error:', err);
      }
    }, 5000);
  }

  function init() {
    const paymentBtn = document.getElementById('payment-btn');
    const paymentModal = document.getElementById('payment-modal');
    const paymentModalClose = document.getElementById('payment-modal-close');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const paymentStatus = document.getElementById('payment-status');
    const paymentChecking = document.getElementById('payment-checking');
    const amountLabel = document.getElementById('payment-amount-label');

    if (amountLabel) {
      amountLabel.textContent = centsToBRL(PAYMENT_AMOUNT);
    }

    if (paymentBtn && paymentModal) {
      const ui = { paymentBtn, paymentModal, paymentModalClose, qrcodeContainer, paymentStatus, paymentChecking };

      paymentBtn.onclick = e => {
        e.preventDefault();
        paymentModal.classList.add('active');
        createPaymentTransaction(ui);
      };

      paymentModalClose.onclick = () => {
        paymentModal.classList.remove('active');
        stopCheck();
      };
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();


