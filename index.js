require('dotenv').config();

const fs = require('fs');
const axios = require('axios');

const apiKey = process.env.API_KEY;

const classifyOption = fs.readFileSync('./opcoes.txt');

const textFieldName = 'teor_ato';

let output = [];

(function () {

    return fs.readFile("./input.json", "utf8", async (error, data) => {
        if (error) {
            console.log(' não conseguiu ler o arquivo de input', error);
            return;
        }


        // try to load already existing responses
        if (fs.existsSync('./output.json')) {
            const alreadyComputedOutputJson = fs.readFileSync('./output.json');
            output = JSON.parse(alreadyComputedOutputJson);
        }


        const input = JSON.parse(data);

        const total = input.length;

        for (let i = 0; i < total; i++) {

            const data = input[i];

            const percentual = Math.trunc(((i + 1) / total) * 100);

            const existingResponse = output.find((d) => d.id_pa === data.id_pa);
            if (existingResponse && existingResponse.ia_result?.error?.code !== "rate_limit_exceeded") {
                console.log(`processando: ${i + 1} de ${total} - ${percentual}% - skiped alerady has response`);
                continue;
            }

            const textToClassify = data[textFieldName];

            const promptText =
                `Dado o seguinte texto: 

                    ${textToClassify} 

                    classifique-o usando apenas um dos seguintes temas:

                    ${classifyOption}`;

            const result = await askIA(promptText);

            if (!existingResponse) {
                output.push({
                    ...data,
                    ia_result: result
                });
            } else {
                output = output.map(d => {
                    if (d.id_pa === data.id_pa) {
                        return ({
                            ...data,
                            ia_result: result
                        });
                    }

                    return d;
                })
            }

            console.log(`processando: ${i + 1}  de  ${total} - ${percentual}% - ${result?.error?.code || result}`);

            let outputJson = JSON.stringify(output);
            fs.writeFileSync('./output.json', outputJson);
            await sleep();
        }

        console.log('Completed saída disponível no arquivo output.json');
    });
})();

function sleep() {
    return new Promise((resolve) => {
        setTimeout(() => resolve(null), 800); // 0.8s
    });
}

function askIA(promptText) {

    return new Promise(async (resolve) => {

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: promptText }],
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                }
            );

            resolve(response?.data?.choices[0]?.message?.content || 'ERRO: sem resposta');
        } catch (error) {
            return resolve('ERRO: ' + error?.response ? error.response?.data : error?.message);
        }

    });
}
