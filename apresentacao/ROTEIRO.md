# Detetive Obtenção — roteiro do vídeo (168 s, com legendas — `legendas.srt`)

| Tempo | Cena | Mensagem | Trilha |
|---|---|---|---|
| 0–12 s | **O caso**: cartão de um sobressalente com descrição pobre (???) | "Uma linha de descrição. Nenhuma pista." | Chuva, drone grave, batimento, sinos frios |
| 12–30 s | **A cadeia**: Navios → Diretoria → Obtenção; fila de itens cresce | A Diretoria é a especialista, mas não consegue manter milhares de descrições | Pulso de baixo, tensão crescente |
| 30–48 s | **Na ponta**: comerciantes ("não conheço", "tenho 20 itens que podem ser esse"); pedido de esclarecimento volta à Diretoria | Horas perdidas, resposta demora | Tique-taque de relógio |
| 48–62 s | **O tempo passa**: 8 meses; "Item excluído" / "Achado — errado" | O erro só aparece meses depois | Batimento acelerando, riser |
| 62–68 s | **Silêncio**: "E se a memória não se perdesse?" | Virada | Vácuo + riser reverso + flash |
| 68–100 s | **A solução** (7 cartões): catálogo dinâmico, chamados com contexto (item + autor + meio/dotação), resposta por áudio/texto/imagem, fornecedores validados, IA que resume, ranking (+2 resposta, +3 fornecedor, +2 validação), supervisão do gerenciador | Aproximar quem entende do item de quem compra | Ação: 132 bpm, baixo pulsante, arpejo, bateria |
| 100–112 s | **Antes × Depois** e fecho | "Uma ideia que busca o melhor para a Marinha." | Acorde maior, sinos, hit final |

Os pontos do ranking (2/3/2) vêm de `src/pages/Ranking.tsx`; nomes, PIs e CNPJs das telas são fictícios.
Regerar: `python3 gerar_audio.py trilha.wav && python3 gerar_video.py trilha.wav detetive_obtencao.mp4`
