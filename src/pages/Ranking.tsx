import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Loader2, TrendingUp, ThumbsUp, MessageSquare, Building2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { RankingItem } from '../types';

export default function Ranking() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const response = await fetch('/api/ranking');
      if (response.ok) {
        setRanking(await response.json());
      }
    } catch (err) {
      console.error('Erro ao buscar ranking', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#39FF14]" />
        <p className="text-[#818384]">Carregando ranking...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Ranking de Colaboradores</h1>
        <p className="text-[#818384]">Reconhecimento aos militares que mais contribuem com inteligência técnica.</p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 items-end pt-10 pb-6">
        {/* 2nd Place */}
        {ranking[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0D2D0D] rounded-full border-2 border-slate-400 flex items-center justify-center">
                <Medal className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center text-[#051A05] font-bold text-xs">2</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-sm sm:text-base line-clamp-1 text-white">{ranking[1].nome}</p>
              <p className="text-[10px] text-[#818384] uppercase">{ranking[1].organizacao_militar}</p>
            </div>
            <div className="w-full h-24 bg-slate-400/20 rounded-t-lg flex items-center justify-center">
              <span className="font-bold text-slate-400">{ranking[1].pontuacao_total} pts</span>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {ranking[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="relative">
              <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#0D2D0D] rounded-full border-4 border-yellow-500 flex items-center justify-center">
                <Trophy className="w-10 h-10 sm:w-14 sm:h-14 text-yellow-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-[#051A05] font-bold">1</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-base sm:text-lg line-clamp-1 text-white">{ranking[0].nome}</p>
              <p className="text-[10px] text-[#818384] uppercase">{ranking[0].organizacao_militar}</p>
            </div>
            <div className="w-full h-32 bg-yellow-500/20 rounded-t-lg flex items-center justify-center">
              <span className="font-bold text-yellow-500">{ranking[0].pontuacao_total} pts</span>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {ranking[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0D2D0D] rounded-full border-2 border-amber-700 flex items-center justify-center">
                <Award className="w-8 h-8 sm:w-10 sm:h-10 text-amber-700" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-700 rounded-full flex items-center justify-center text-[#051A05] font-bold text-xs">3</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-sm sm:text-base line-clamp-1 text-white">{ranking[2].nome}</p>
              <p className="text-[10px] text-[#818384] uppercase">{ranking[2].organizacao_militar}</p>
            </div>
            <div className="w-full h-20 bg-amber-700/20 rounded-t-lg flex items-center justify-center">
              <span className="font-bold text-amber-700">{ranking[2].pontuacao_total} pts</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* List */}
      <div className="bg-[#0A240A] border border-[#1A3A1A] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1A3A1A] bg-[#0D2D0D] grid grid-cols-12 text-[10px] font-bold text-[#818384] uppercase tracking-wider">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-3">Colaborador</div>
          <div className="col-span-2 flex items-center justify-center gap-1" title="Respostas">
            <span>R</span>
            <MessageSquare className="w-3 h-3" />
          </div>
          <div className="col-span-2 flex items-center justify-center gap-1" title="Curtidas Recebidas">
            <span>C</span>
            <ThumbsUp className="w-3 h-3" />
          </div>
          <div className="col-span-2 flex items-center justify-center gap-1" title="Fornecedores">
            <span>F</span>
            <Building2 className="w-3 h-3" />
          </div>
          <div className="col-span-1 flex items-center justify-center gap-1" title="Validações">
            <span>V</span>
            <CheckCircle2 className="w-3 h-3" />
          </div>
          <div className="col-span-1 flex items-center justify-center gap-1" title="Pontos">
            <span>P</span>
            <TrendingUp className="w-3 h-3" />
          </div>
        </div>
        <div className="divide-y divide-[#1A3A1A]">
          {ranking.map((item, index) => (
            <div key={item.codigo_interno} className="p-4 grid grid-cols-12 items-center hover:bg-[#39FF14]/5 transition-colors">
              <div className="col-span-1 text-center font-bold text-[#818384]">{index + 1}</div>
              <div className="col-span-3">
                <p className="font-bold text-sm text-white">{item.nome}</p>
                <p className="text-[10px] text-[#818384] uppercase">{item.organizacao_militar}</p>
              </div>
              <div className="col-span-2 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-[#818384]">
                  <MessageSquare className="w-3 h-3" />
                  <span>{item.total_respostas}</span>
                </div>
              </div>
              <div className="col-span-2 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-[#818384]">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{item.total_curtidas_recebidas}</span>
                </div>
              </div>
              <div className="col-span-2 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-[#818384]">
                  <Building2 className="w-3 h-3" />
                  <span>{item.total_fornecedores}</span>
                </div>
              </div>
              <div className="col-span-1 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-[#818384]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{item.total_validacoes_feitas}</span>
                </div>
              </div>
              <div className="col-span-1 text-center">
                <span className="font-bold text-[#39FF14]">{item.pontuacao_total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 bg-[#0A240A] border border-[#1A3A1A] rounded-lg space-y-4">
        <h3 className="font-bold flex items-center gap-2 text-white">
          <TrendingUp className="w-5 h-5 text-[#39FF14]" />
          Como funciona a pontuação?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#818384]">
          <div className="p-3 bg-[#0D2D0D] rounded-lg border border-[#1A3A1A]">
            <p className="font-bold text-[#39FF14] mb-1 uppercase text-[10px]">Respostas Úteis</p>
            <p>Cada comentário em uma consulta técnica vale <span className="text-white font-bold">2 pontos</span>.</p>
          </div>
          <div className="p-3 bg-[#0D2D0D] rounded-lg border border-[#1A3A1A]">
            <p className="font-bold text-[#39FF14] mb-1 uppercase text-[10px]">Reconhecimento</p>
            <p>Cada curtida recebida em seus comentários vale <span className="text-white font-bold">1 ponto</span>.</p>
          </div>
          <div className="p-3 bg-[#0D2D0D] rounded-lg border border-[#1A3A1A]">
            <p className="font-bold text-[#39FF14] mb-1 uppercase text-[10px]">Fornecedores</p>
            <p>Cada fornecedor indicado para um item vale <span className="text-white font-bold">3 pontos</span>.</p>
          </div>
          <div className="p-3 bg-[#0D2D0D] rounded-lg border border-[#1A3A1A]">
            <p className="font-bold text-[#39FF14] mb-1 uppercase text-[10px]">Validar contato de empresas</p>
            <p>Checar e validar uma informação da comunidade vale <span className="text-white font-bold">2 pontos</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
