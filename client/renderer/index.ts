import * as THREE from "three";
THREE.Euler.DefaultOrder = "YXZ";

import camera from "./camera";
import * as courtModel from "./courtModel";
import ballModel from "./ballModel";
import * as character from "./character";

import * as input from "./input";
import { socket, myPlayerId, players, pub } from "../gameClient";
import * as shared from "../../shared";

const modelsById: { [playerId: string]: character.Model; } = {};

export const canvas = document.querySelector("canvas") as HTMLCanvasElement;

const threeRenderer = new THREE.WebGLRenderer({ canvas });
threeRenderer.shadowMap.enabled = true;
threeRenderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.add(courtModel.root);
scene.add(ballModel);

let animationId: number;

export function start() {
  animationId = requestAnimationFrame(animate);
}

export function stop() {
  cancelAnimationFrame(animationId);
  animationId = null;
}

export function addPlayer(player: Game.PlayerPub) {
  const model = character.makeModel(player.avatar);
  courtModel.root.add(model.root);
  modelsById[player.id] = model;

  if (player.id === myPlayerId) {
    input.initPrediction(player.avatar);
  }

  if (pub.ball.playerId === player.id) catchBall(pub.ball.playerId);
}

export function removePlayer(playerId: string) {
  const model = modelsById[playerId];
  model.root.parent.remove(model.root);

  delete modelsById[playerId];
}

export function reset() {
  scene.add(ballModel);
  ballModel.position.set(0, 1, 0);
  for (const playerId in modelsById) removePlayer(playerId);
}

export function catchBall(playerId: string) {
  if (playerId === myPlayerId) {
    const myPlayer = players.byId[myPlayerId];
    input.prediction.x = myPlayer.avatar.x;
    input.prediction.z = myPlayer.avatar.z;
  }

  ballModel.position.set(shared.armLength, 0, 0);
  modelsById[playerId].shoulders.add(ballModel);
}

export function throwBall(ball: Game.BallPub) {
  scene.add(ballModel);
  ballModel.position.set(ball.x, ball.y, ball.z);
}

const tmpEuler = new THREE.Euler();

let sceneAngleY = 0;

function lerp(a: number, b: number, v: number) {
  return a + (b - a) * v;
}

export let ballThrownTimer = 0;
function animate() {
  animationId = requestAnimationFrame(animate);

  if (pub != null && pub.match == null) {
    sceneAngleY += Math.PI / 640;
  } else {
    if (Math.abs(sceneAngleY) > 0.1) sceneAngleY = lerp(sceneAngleY, 0, 0.15);
    else sceneAngleY = 0;
  }
  if (sceneAngleY > Math.PI) sceneAngleY -= Math.PI * 2;
  scene.setRotationFromEuler(tmpEuler.set(0, sceneAngleY, 0));

  let width = canvas.parentElement.clientWidth;
  let height = canvas.parentElement.clientHeight;
  if (width > height * 4 / 3) width = height * 4 / 3;
  if (height > width * 3 / 4) height = width * 3 / 4;

  canvas.width = width;
  canvas.height = height;

  camera.updateProjectionMatrix();

  threeRenderer.setSize(canvas.width, canvas.height, false);
  threeRenderer.render(scene, camera);

  input.gather();
  if (input.hasJustPressedLeftTrigger) { socket.emit("throwBall"); }

  for (const playerId in modelsById) {
    const model = modelsById[playerId];
    const { avatar } = players.byId[playerId];
    const hasBall = pub.ball.playerId === playerId;

    if (playerId === myPlayerId) {
      // TODO: Use proper ticking mechanism
      input.predict(pub.match != null, pub.ball.playerId === myPlayerId, ballThrownTimer > 0);

      model.root.position.set(input.prediction.x, 0, input.prediction.z);
      model.root.setRotationFromEuler(tmpEuler.set(0, -input.prediction.angleY, 0));
      model.shoulders.setRotationFromEuler(tmpEuler.set(0, 0, input.prediction.catching || hasBall ? input.prediction.angleX : -Math.PI / 2));
    } else {
      // TODO: Lerp between previous and current!
      model.root.position.set(avatar.x, 0, avatar.z);
      model.root.setRotationFromEuler(tmpEuler.set(0, -avatar.angleY, 0));
      model.shoulders.setRotationFromEuler(tmpEuler.set(0, 0, avatar.catching || hasBall ? avatar.angleX : -Math.PI / 2));
    }
  }

  if (pub != null && pub.ball.playerId == null) {
    ballModel.position.set(pub.ball.x, pub.ball.y, pub.ball.z);
  }
}

export function tick() {
  // TODO: Store next/previous ticks for interpolation/extrapolation
  if (ballThrownTimer > 0) ballThrownTimer--;
}
