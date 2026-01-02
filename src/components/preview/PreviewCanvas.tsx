import React, { useEffect, useRef } from 'react';
import { useGenerationStore } from '../../stores/generationStore';
import type { GeneratedRoom } from '../../types';

const ROOM_COLORS: Record<string, string> = {
  start: '#22c55e',
  boss: '#ef4444',
  treasure: '#f59e0b',
  shop: '#06b6d4',
  secret: '#8b5cf6',
  default: '#3b82f6',
};

interface PreviewCanvasProps {
  width?: number;
  height?: number;
}

export function PreviewCanvas({ width = 400, height = 300 }: PreviewCanvasProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { lastResult } = useGenerationStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const layout = lastResult?.data;
    if (!layout || !lastResult.success) {
      // Draw placeholder text
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        lastResult?.errors?.[0] || 'Click Generate to preview',
        width / 2,
        height / 2
      );
      return;
    }

    // Calculate bounds for centering
    const bounds = calculateBounds(layout.rooms);
    const scale = calculateScale(bounds, width, height);
    const offset = calculateOffset(bounds, width, height, scale);

    // Draw connections first (behind rooms)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    layout.connections.forEach((conn) => {
      const fromRoom = layout.rooms.find((r) => r.id === conn.fromRoomId);
      const toRoom = layout.rooms.find((r) => r.id === conn.toRoomId);
      if (!fromRoom || !toRoom) return;

      const fromCenter = getRoomCenter(fromRoom);
      const toCenter = getRoomCenter(toRoom);

      ctx.beginPath();
      ctx.moveTo(
        fromCenter.x * scale + offset.x,
        fromCenter.y * scale + offset.y
      );
      ctx.lineTo(
        toCenter.x * scale + offset.x,
        toCenter.y * scale + offset.y
      );
      ctx.stroke();
    });

    // Draw rooms
    layout.rooms.forEach((room) => {
      const x = room.bounds.x * scale + offset.x;
      const y = room.bounds.y * scale + offset.y;
      const w = room.bounds.width * scale;
      const h = room.bounds.height * scale;

      // Room fill
      const color = ROOM_COLORS[room.type] || ROOM_COLORS.default;
      ctx.fillStyle = color + '40'; // 25% opacity
      ctx.fillRect(x, y, w, h);

      // Room border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Room label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.type, x + w / 2, y + h / 2);
    });

    // Draw player start
    if (layout.playerStart) {
      const sx = layout.playerStart.x * scale + offset.x;
      const sy = layout.playerStart.y * scale + offset.y;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw exits
    layout.exits.forEach((exit) => {
      const ex = exit.x * scale + offset.x;
      const ey = exit.y * scale + offset.y;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [lastResult, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border border-slate-700"
    />
  );
}

function calculateBounds(rooms: GeneratedRoom[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (rooms.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  rooms.forEach((room) => {
    minX = Math.min(minX, room.bounds.x);
    minY = Math.min(minY, room.bounds.y);
    maxX = Math.max(maxX, room.bounds.x + room.bounds.width);
    maxY = Math.max(maxY, room.bounds.y + room.bounds.height);
  });

  return { minX, minY, maxX, maxY };
}

function calculateScale(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  canvasWidth: number,
  canvasHeight: number
): number {
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;
  
  const padding = 40;
  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  const scaleX = availableWidth / worldWidth;
  const scaleY = availableHeight / worldHeight;

  const CELL_SIZE = 16;
  return Math.min(scaleX, scaleY, CELL_SIZE);
}

function calculateOffset(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): { x: number; y: number } {
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;

  const scaledWidth = worldWidth * scale;
  const scaledHeight = worldHeight * scale;

  return {
    x: (canvasWidth - scaledWidth) / 2 - bounds.minX * scale,
    y: (canvasHeight - scaledHeight) / 2 - bounds.minY * scale,
  };
}

function getRoomCenter(room: GeneratedRoom): { x: number; y: number } {
  return {
    x: room.bounds.x + room.bounds.width / 2,
    y: room.bounds.y + room.bounds.height / 2,
  };
}
