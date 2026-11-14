# Ruwer Garage

Site do complexo automotivo Ruwer Garage (Vicente Pires, Brasília).

## Rodar

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # gera a pasta dist/
```

## Estrutura

- `index.html`: estrutura da página
- `public/css/`: estilos (a ordem de carregamento está no `<head>`)
- `public/js/`: scripts clássicos que compartilham `window.RUWER` (`config.js`)
- `public/assets/`: imagens e vídeo
- `_versao-anterior/`: versão anterior do site, guardada como referência

Antes de publicar: troque o número do WhatsApp (`NUM` em `public/js/config.js`) e preencha endereço e horário.
