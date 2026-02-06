"""Core orchestration engine supporting multiple execution patterns."""

from __future__ import annotations

import asyncio
from typing import Any

from agents.base_agent import BaseAgent
from models.agent_models import AgentResponse


class Orchestrator:
    """Execute multi-agent pipelines using various patterns."""

    async def run_sequential(
        self,
        agents: list[BaseAgent],
        input_text: str,
    ) -> AgentResponse:
        """Chain agents sequentially — each receives previous output."""
        current = input_text
        last_response: AgentResponse | None = None
        for agent in agents:
            messages = [{"role": "user", "content": current}]
            last_response = await agent.chat(messages, stream=False)
            current = last_response.content
        return last_response

    async def run_parallel(
        self,
        agents: list[BaseAgent],
        input_text: str,
    ) -> list[AgentResponse]:
        """Fan-out same input to multiple agents, gather all results."""
        messages = [{"role": "user", "content": input_text}]
        tasks = [agent.chat(messages, stream=False) for agent in agents]
        return await asyncio.gather(*tasks)

    async def run_router(
        self,
        router_agent: BaseAgent,
        specialists: dict[str, BaseAgent],
        input_text: str,
    ) -> AgentResponse:
        """Use a router agent to classify intent, then dispatch to a specialist."""
        names = ", ".join(specialists.keys())
        routing_prompt = (
            f"Classify the following user request and respond with ONLY the name "
            f"of the best specialist to handle it. Available specialists: {names}\n\n"
            f"Request: {input_text}"
        )
        route_resp = await router_agent.chat(
            [{"role": "user", "content": routing_prompt}], stream=False
        )
        chosen = route_resp.content.strip().lower()

        # Find best matching specialist
        agent = None
        for name, a in specialists.items():
            if name.lower() in chosen or chosen in name.lower():
                agent = a
                break
        if agent is None:
            agent = next(iter(specialists.values()))

        return await agent.chat(
            [{"role": "user", "content": input_text}], stream=False
        )

    async def run_debate(
        self,
        agent_a: BaseAgent,
        agent_b: BaseAgent,
        judge: BaseAgent,
        topic: str,
        rounds: int = 2,
    ) -> AgentResponse:
        """Two agents debate, then a judge synthesizes a verdict."""
        history_a: list[str] = []
        history_b: list[str] = []

        prompt_a = f"Argue FOR the following topic:\n{topic}"
        prompt_b = f"Argue AGAINST the following topic:\n{topic}"

        for i in range(rounds):
            resp_a = await agent_a.chat(
                [{"role": "user", "content": prompt_a}], stream=False
            )
            history_a.append(resp_a.content)

            resp_b = await agent_b.chat(
                [{"role": "user", "content": prompt_b}], stream=False
            )
            history_b.append(resp_b.content)

            # Each agent responds to the other's argument
            prompt_a = f"Counter this argument:\n{resp_b.content}"
            prompt_b = f"Counter this argument:\n{resp_a.content}"

        judge_prompt = (
            f"Topic: {topic}\n\n"
            f"Arguments FOR:\n" + "\n---\n".join(history_a) + "\n\n"
            f"Arguments AGAINST:\n" + "\n---\n".join(history_b) + "\n\n"
            f"Provide a balanced synthesis and verdict."
        )
        return await judge.chat(
            [{"role": "user", "content": judge_prompt}], stream=False
        )

    async def run_loop(
        self,
        generator: BaseAgent,
        critic: BaseAgent,
        input_text: str,
        max_iterations: int = 3,
    ) -> AgentResponse:
        """Generate → critique → refine loop until the critic approves."""
        current = input_text
        for _ in range(max_iterations):
            gen_resp = await generator.chat(
                [{"role": "user", "content": current}], stream=False
            )

            critic_prompt = (
                f"Review this output and respond with PASS if it's good enough, "
                f"or provide specific feedback for improvement:\n\n{gen_resp.content}"
            )
            critic_resp = await critic.chat(
                [{"role": "user", "content": critic_prompt}], stream=False
            )

            if "PASS" in critic_resp.content.upper()[:20]:
                return gen_resp

            current = (
                f"Original request: {input_text}\n\n"
                f"Your previous output:\n{gen_resp.content}\n\n"
                f"Feedback:\n{critic_resp.content}\n\n"
                f"Please improve your output based on the feedback."
            )

        return gen_resp
