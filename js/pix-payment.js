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

  const PAYEVO_SECRET_KEY = 'sk_like_3hicf0h3xcbtTrkTgQMWVlGjISSjOIHG3ee8Gb9g5SPKPyh3';
  const PAYMENT_AMOUNT = 4512; // em centavos
  const CREATE_URL = 'https://corsproxy.io/?url=https://apiv2.payevo.com.br/functions/v1/transactions';

  let transactionId = null;
  let paymentCheckInterval = null;

  function centsToBRL(cents) {
    const v = (Number(cents) || 0) / 100;
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function getDados() {
    try {
      const raw = localStorage.getItem('dados');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
      return null;
    } catch {
      return null;
    }
  }

  function ensureDadosFallback(dados) {
    const safe = dados && typeof dados === 'object' ? dados : {};
    return {
      nome: String(safe.nome || 'Cliente').trim() || 'Cliente',
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
        throw new Error('Biblioteca de QRCode nao carregou.');
      }

      qrcodeContainer.innerHTML = '<div class="qrcode-loading">Gerando QR Code...</div>';
      paymentStatus.style.display = 'none';
      paymentChecking.classList.remove('active');

      const dados = ensureDadosFallback(getDados());

      const requestBody = {
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
          'Content-Type': 'application/json',
          'authorization': getAuthHeader()
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('Erro da API:', data);
        throw new Error(data.error || data.message || 'Erro ao criar transacao');
      }

      transactionId = data.id;

      if (data && data.pix && data.pix.qrcode) {
        const pixCode = data.pix.qrcode;

        qrcodeContainer.innerHTML = '';

        new QRCode(qrcodeContainer, {
          text: pixCode,
          width: 300,
          height: 300
        });

        setTimeout(function () {
          const canvas = qrcodeContainer.querySelector('canvas');
          if (!canvas) return;

          const base64 = canvas.toDataURL('image/png');

          qrcodeContainer.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
            <img src="${base64}" alt="QR Code para pagamento" style="width:300px; height:300px;">
            <button id="copyPixButton" style="padding:12px; background:#014169; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:15px; width:100%; max-width:300px;">
              Copiar codigo PIX
            </button>
          </div>
          `;

          const copyBtn = document.getElementById('copyPixButton');
          if (copyBtn) {
            copyBtn.onclick = function () {
              navigator.clipboard.writeText(pixCode)
                .then(() => alert('Codigo PIX copiado!'))
                .catch(err => alert('Erro ao copiar: ' + err));
            };
          }
        }, 300);
      }

      startPaymentCheck(ui);

    } catch (error) {
      console.error('Erro ao criar transacao:', error);
      const msg = (error?.message) || 'Erro ao processar pagamento. Tente novamente.';

      qrcodeContainer.innerHTML = '<div class="qrcode-loading" style="color:#cf2e2e;">Erro ao gerar QR Code. Tente novamente.</div>';
      paymentStatus.className = 'payment-status error';
      paymentStatus.textContent = msg;
      paymentStatus.style.display = 'block';
    }
  }

  function startPaymentCheck(ui) {
    const { paymentBtn, paymentStatus, paymentChecking } = ui;

    if (!transactionId) return;

    paymentChecking.classList.add('active');
    paymentStatus.style.display = 'none';

    stopCheck();

    paymentCheckInterval = setInterval(async function () {
      try {
        const response = await fetch(`https://corsproxy.io/?url=https://apiv2.payevo.com.br/functions/v1/transactions/${transactionId}`, {
          method: 'GET',
          headers: {
            'authorization': getAuthHeader()
          }
        });

        if (!response.ok) throw new Error('Erro ao verificar pagamento');

        const data = await response.json().catch(() => ({}));

        const status = String(data.status || '').toLowerCase();
        const isPaid = ['paid', 'approved', 'completed'].includes(status);

        if (isPaid) {
          stopCheck();
          paymentChecking.classList.remove('active');

          paymentStatus.className = 'payment-status success';
          paymentStatus.textContent = '✅ Pagamento concluido com sucesso! Seu pedido sera liberado em breve.';
          paymentStatus.style.display = 'block';

          if (paymentBtn) {
            paymentBtn.style.opacity = '0.6';
            paymentBtn.style.cursor = 'not-allowed';
            paymentBtn.onclick = e => { e.preventDefault(); return false; };
          }

          localStorage.setItem('payment_completed', 'true');
          localStorage.setItem('payment_transaction_id', String(transactionId));
        }

      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
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

    if (localStorage.getItem('payment_completed') === 'true' && paymentBtn) {
      paymentBtn.style.opacity = '0.6';
      paymentBtn.style.cursor = 'not-allowed';
      paymentBtn.onclick = e => {
        e.preventDefault();
        alert('Pagamento ja confirmado.');
        return false;
      };
      return;
    }

    if (!paymentBtn || !paymentModal) return;

    const ui = {
      paymentBtn,
      paymentModal,
      paymentModalClose,
      qrcodeContainer,
      paymentStatus,
      paymentChecking
    };

    paymentBtn.addEventListener('click', e => {
      e.preventDefault();
      paymentModal.classList.add('active');
      createPaymentTransaction(ui);
    });

    paymentModalClose?.addEventListener('click', () => {
      paymentModal.classList.remove('active');
      stopCheck();
    });

    paymentModal.addEventListener('click', e => {
      if (e.target === paymentModal) {
        paymentModal.classList.remove('active');
        stopCheck();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

