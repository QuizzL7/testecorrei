window.onload = steps();

function steps() {
    document.getElementById('steps').innerHTML = `
        <div class="timeline-bar"></div>
        <li class="step">
            <div class="arrow-current">
                <div class="circle">
                    <img class="circle-img" src="./images/aguardando-pagamento.png">
                </div>
            </div>
            <div class="step-content">
                <p class="text text-head" style="color: red">Aguardando pagamento</p>
                <p class="text text-content">CURITIBA - PR</p>
                <p class="text text-content">${datetime(false, 1)} - 13:43:12 </p>
            </div>
        </li>
        <li class="step">
            <div class="arrow">
                <div class="circle">
                    <img class="circle-img" src="./images/caminhao-cor.png">
                </div>
            </div>
            <div class="step-content">
                <p class="text text-head">Encaminhado para fiscalização aduaneira</p>
                <p class="text text-content">CURITIBA - PR</p>
                <p class="text text-content">${datetime(false, 2)} - 09:10:23 </p>
            </div>
        </li>
        <li class="step">
            <div class="arrow">
                <div class="circle">
                    <img class="circle-img" src="./images/brazil.png">
                </div>
            </div>
            <div class="step-content">
                <p class="text text-head">Objeto recebido pelos Correios do Brasil</p>
                <p class="text text-content">CURITIBA - PR</p>
                <p class="text text-content">${datetime(false, 3)} - 11:01:14 </p>
            </div>
        </li>
        <li class="step">
            <div class="arrow">
                <div class="circle">
                    <img class="circle-img" src="./images/caminhao-cor.png">
                </div>
            </div>
            <div class="step-content">
                <p class="text text-head">Objeto em trânsito - por favor aguarde</p>
                <p class="text text-content">para Unidade de Tratamento Internacional - BR</p>
                <p class="text text-content">CHINA</p>
                <p class="text text-content">${datetime(true, 4)} - 10:05:16 </p>
            </div>
        </li>
        <li class="step">
            <div class="arrow">
                <div class="circle">
                    <img class="circle-img" src="./images/agencia-cor.png" alt="Postado">
                </div>
            </div>
            <div class="step-content">
                <p class="text text-head">Objeto postado</p>
                <p class="text text-content">CHINA</p>
                <p class="text text-content">${datetime(true, 5)} - 13:10:17</p>
            </div>
        </li>`;
}

function weekend(date, day, f) {

    const week = date.isoWeekday()
    let days = 0

    if (week === 6 || week === 7) days = 1;
    if (week === 1) days = 2;

    const a = date.subtract(day + days, 'days').isoWeekday()

    if (a == 7) return 4;
    if (a == 6) return 5;

    if (a == 5 && f) {
        return 6
    } else if (a == 4 && f) {
        return 7
    }

    return days + day
}

function timezone() {
    return moment().tz('America/Sao_Paulo');
}

function datetime(f = false, d) {
    const date = timezone()
    return date.subtract(weekend(timezone(), d, f), 'days').format('DD/MM/YYYY');
}
