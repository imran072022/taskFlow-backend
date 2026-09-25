import {
  Body,
  Container,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

type Props = {
  otp: number;
};

const ForgotPasswordOtpEmail = ({ otp }: Props) => {
  return (
    <Html>
      <Preview>Reset your Task Flow password</Preview>

      <Tailwind>
        <Body className="m-0 bg-zinc-100 px-5 py-10 font-sans">
          <Container className="mx-auto max-w-[480px] rounded-lg bg-white p-8">
            <Heading className="m-0 mb-6 text-center text-2xl font-bold text-zinc-900">
              Reset your Task Flow password
            </Heading>

            <Text className="m-0 mb-4 text-base leading-6 text-zinc-700">
              We received a request to reset your Task Flow password. Use the
              verification code below to continue.
            </Text>

            <Section className="my-6 rounded-md bg-zinc-100 p-5 text-center">
              <Text className="m-0 text-3xl font-bold tracking-[6px] text-zinc-900">
                {otp}
              </Text>
            </Section>

            <Text className="m-0 text-center text-sm leading-5 text-zinc-500">
              This verification code will expire in 5 minutes.
            </Text>

            <Text className="mt-6 text-center text-xs leading-5 text-zinc-400">
              If you did not request a password reset, you can safely ignore
              this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ForgotPasswordOtpEmail;
