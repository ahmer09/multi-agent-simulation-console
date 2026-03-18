import React from 'react';
import ThinkingChain from './ThinkingChain';

/**
 * StepInspector — thin wrapper that embeds ThinkingChain
 * with agent-filtered events.
 */
export default function StepInspector({ agent, events }) {
  return <ThinkingChain agent={agent} events={events} />;
}
